"""Unit tests for the approval engine (EX-101/103/105/106 acceptance criteria)."""
import os
import shutil
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import approval_engine as ae  # noqa: E402

T0 = "2026-07-13T09:00:00Z"          # a Monday
NOW = lambda h=0, d=0: ae.iso(ae.parse_iso(T0) + __import__("datetime").timedelta(hours=h, days=d))


class EngineTest(unittest.TestCase):
    def setUp(self):
        # sandbox the company/ tree so tests never touch real records
        self.backup = {}
        for d in (ae.APPROVALS, ae.QUESTIONS):
            if d.exists():
                self.backup[d] = d.with_suffix(".bak")
                shutil.move(d, self.backup[d])
            d.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        for d in (ae.APPROVALS, ae.QUESTIONS):
            shutil.rmtree(d, ignore_errors=True)
        for orig, bak in self.backup.items():
            shutil.move(bak, orig)
        subprocess.run(["git", "checkout", "--", "company/registry.md"],
                       cwd=ROOT, capture_output=True)

    # -- helpers --
    def new(self, gate="merge-deploy", prio="P1", **kw):
        args = ["new", "--gate", gate, "--priority", prio, "--requested-by", "developer",
                "--artifact", "README.md", "--action", f"test action for {gate}",
                "--now", kw.pop("now", T0)]
        for k, v in kw.items():
            args += [f"--{k.replace('_','-')}"] + ([] if v is True else [v])
        ae.main(args)
        recs = ae.all_records()
        return recs[-1]

    def data(self, path):
        d, _ = ae.load(path)
        return d

    # ---------- routing (EX-101/EX-008 parity) ----------
    def test_routing_all_gates(self):
        expect = {"merge-deploy": "engineering", "money": "people-finance",
                  "people": "people-finance", "procurement": "operations",
                  "revenue-booking": "people-finance",
                  "external-comms": "marketing-support", "commitments": "sales-delivery"}
        for gate, dept in expect.items():
            p = self.new(gate=gate)
            self.assertEqual(self.data(p)["department"], dept, gate)

    def test_special_rules(self):
        p = self.new(gate="external-comms", customer_specific=True)
        self.assertEqual(self.data(p)["department"], "sales-delivery")
        p = self.new(gate="commitments", roadmap=True)
        self.assertEqual(self.data(p)["department"], "product-design")

    def test_engineering_routes_to_saravanan(self):
        p = self.new(gate="merge-deploy")
        self.assertEqual(self.data(p)["assignee"], "saravanan-p")

    def test_business_day_sla(self):
        # Friday P1 -> due Monday
        p = self.new(now="2026-07-17T09:00:00Z")
        self.assertEqual(self.data(p)["sla_due"], "2026-07-20T09:00:00Z")

    # ---------- validation (EX-101) ----------
    def test_valid_record_passes(self):
        p = self.new()
        self.assertEqual(ae.validate_one(p), [])

    def test_invalid_classes_fail(self):
        p = self.new()
        d, b = ae.load(p)
        d["gate"] = "not-a-gate"
        ae.save(p, d, b)
        self.assertTrue(any("gate=" in e for e in ae.validate_one(p)))
        d["gate"] = "merge-deploy"
        del d["assignee"]
        ae.save(p, d, b)
        self.assertTrue(any("missing key 'assignee'" in e for e in ae.validate_one(p)))

    def test_no_expired_state(self):
        self.assertNotIn("expired", ae.STATES)  # ADR-0004 by construction

    # ---------- scan / SLA / escalation (EX-103, EX-104) ----------
    def test_assignment_notification_idempotent(self):
        p = self.new()
        ae.main(["scan", "--now", T0])
        ae.main(["scan", "--now", T0])  # double run
        d = self.data(p)
        assigned = [n for n in d["notified"] if n["kind"] == "assigned"]
        self.assertEqual(len(assigned), 1)

    def test_sla_breach_hops_and_notifies_both(self):
        p = self.new()  # engineering: approver=saravanan-p, deputy=saran
        ae.main(["scan", "--now", T0])
        ae.main(["scan", "--now", NOW(d=2)])  # past 1 business day
        d = self.data(p)
        self.assertEqual(len(d["hops"]), 1)
        self.assertEqual(d["hops"][0]["reason"], "sla-breach")
        self.assertEqual(d["assignee"], "saran")  # deputy
        esc = {n["to"] for n in d["notified"] if n["kind"] == "escalated"}
        self.assertEqual(esc, {"saravanan-p", "saran"})
        self.assertEqual(d["state"], "pending")  # never auto-resolves

    def test_unavailability_skips_immediately(self):
        p = self.new()
        sp = ae.ORG / "humans" / "saravanan-p.md"
        original = sp.read_text()
        try:
            sp.write_text(original.replace("availability: available", "availability: ooo"))
            ae.main(["scan", "--now", T0])  # SLA NOT breached — skip is availability-driven
            d = self.data(p)
            self.assertEqual(d["hops"][0]["reason"], "unavailable")
            self.assertEqual(d["assignee"], "saran")
        finally:
            sp.write_text(original)

    def test_chain_never_dead_ends(self):
        p = self.new()
        for i in range(1, 6):
            ae.main(["scan", "--now", NOW(d=2 * i)])
        d = self.data(p)
        self.assertEqual(d["assignee"], "saran")     # ceo terminal backstop
        self.assertEqual(d["state"], "pending")      # still a human's decision

    # ---------- decide (EX-105) ----------
    def test_unauthorized_refused(self):
        p = self.new(gate="money")  # people-finance: saravanan-p holds NO seat there
        with self.assertRaises(SystemExit):
            ae.main(["decide", p.stem, "--by", "saravanan-p", "--outcome", "approved"])
        self.assertEqual(self.data(p)["state"], "pending")

    def test_crm_grants_never_authorize(self):
        # Tech Spec 002 §4.1: crm-viewer/crm-editor are record-access grants,
        # not decision seats — a member with a grant IN the department must
        # still be refused (lockstep with panel/lib/org.ts authorized()).
        humans = {"m": {"id": "m", "roles": [
            {"department": "people-finance", "seat": "crm-editor"},
            {"department": "people-finance", "seat": "crm-viewer"},
        ]}}
        self.assertFalse(ae.authorized(humans, "m", "people-finance"))
        chain = {"a": {"id": "a", "roles": [{"department": "people-finance", "seat": "approver"}]}}
        self.assertTrue(ae.authorized(chain, "a", "people-finance"))

    def test_reject_requires_reason(self):
        p = self.new()
        with self.assertRaises(SystemExit):
            ae.main(["decide", p.stem, "--by", "saravanan-p", "--outcome", "rejected"])

    def test_approve_stamps_and_flips(self):
        p = self.new()
        ae.main(["decide", p.stem, "--by", "saravanan-p", "--outcome", "approved", "--now", T0])
        d = self.data(p)
        self.assertEqual(d["state"], "approved")
        self.assertEqual(d["decision"]["by"], "saravanan-p")
        self.assertIn("approved_artifact_sha", d)

    def test_dual_approval_needs_two_stamps(self):
        p = self.new(gate="people")
        ae.main(["decide", p.stem, "--by", "saran", "--outcome", "approved", "--now", T0])
        self.assertEqual(self.data(p)["state"], "pending")  # one stamp not enough
        ae.main(["decide", p.stem, "--by", "saran", "--outcome", "approved", "--now", NOW(h=1)])
        d = self.data(p)
        self.assertEqual(d["state"], "approved")
        self.assertEqual(len([s for s in d["stamps"] if s["outcome"] == "approved"]), 2)

    def test_dual_approval_requires_distinct_humans_when_two_qualified(self):
        """EX-206 M3: once a second human is qualified for the people gate,
        the two approving stamps must come from DISTINCT people; the same human
        can no longer co-sign alone."""
        temp = ae.ORG / "humans" / "pf-approver.md"
        temp.write_text(
            "---\nid: pf-approver\nname: PF Approver\nemail: pf@example.com\n"
            "title: Finance\navailability: available\nooo_until: null\nroles:\n"
            "  - {department: people-finance, seat: approver}\ncreated: 2026-07-14\n---\n\nx\n"
        )
        try:
            p = self.new(gate="people")
            # two ceo stamps by the SAME human no longer close the gate
            ae.main(["decide", p.stem, "--by", "saran", "--outcome", "approved", "--now", T0])
            ae.main(["decide", p.stem, "--by", "saran", "--outcome", "approved", "--now", NOW(h=1)])
            self.assertEqual(self.data(p)["state"], "pending")  # distinct now required
            # a distinct people-finance seat-holder's stamp closes it
            ae.main(["decide", p.stem, "--by", "pf-approver", "--outcome", "approved", "--now", NOW(h=2)])
            self.assertEqual(self.data(p)["state"], "approved")
        finally:
            temp.unlink(missing_ok=True)

    def test_slack_message_has_deeplink_and_action(self):
        """EX-303: the Slack message carries the exact action and a deep link."""
        p = self.new(gate="merge-deploy")
        d = self.data(p)
        os.environ.pop("PANEL_BASE_URL", None)
        msg = ae.slack_message(d, d["assignee"], "assigned")
        self.assertIn(d["action"], msg)
        self.assertIn(d["id"], msg)
        self.assertIn("github.com", msg)  # falls back to the record file link

    def test_record_link_prefers_panel_url(self):
        p = self.new()
        d = self.data(p)
        os.environ["PANEL_BASE_URL"] = "https://panel.example"
        try:
            self.assertEqual(ae.record_link(d), f"https://panel.example/item/{d['id']}")
        finally:
            os.environ.pop("PANEL_BASE_URL", None)

    def test_send_slack_dry_run_never_calls_network(self):
        """Dry-run returns delivered without touching the network."""
        p = self.new()
        d = self.data(p)
        delivered, ts = ae.send_slack({}, d, d["assignee"], "assigned", None, really=False)
        self.assertTrue(delivered)

    def test_send_slack_unconfigured_is_a_safe_noop(self):
        """really=True but no webhook/token/slack_id → skip, never raises (UC3)."""
        for var in ("SLACK_WEBHOOK_URL", "SLACK_BOT_TOKEN"):
            os.environ.pop(var, None)
        p = self.new()
        d = self.data(p)
        delivered, ts = ae.send_slack({}, d, d["assignee"], "assigned", None, really=True)
        self.assertFalse(delivered)

    def test_scan_send_slack_idempotent(self):
        """A second scan with --send-slack must not re-notify (shared log)."""
        p = self.new(gate="merge-deploy")
        ae.main(["scan", "--send-slack", "--now", T0])
        n1 = len(self.data(p)["notified"])
        ae.main(["scan", "--send-slack", "--now", T0])
        self.assertEqual(len(self.data(p)["notified"]), n1)  # no double-send

    def test_question_answered(self):
        args = ["new", "--type", "question", "--gate", "commitments", "--requested-by",
                "sales", "--artifact", "README.md", "--action", "Which option?", "--now", T0]
        ae.main(args)
        p = ae.all_records()[-1]
        with self.assertRaises(SystemExit):
            ae.main(["decide", p.stem, "--by", "saran", "--outcome", "approved"])
        ae.main(["decide", p.stem, "--by", "saran", "--outcome", "answered",
                 "--reason", "option B", "--now", T0])
        self.assertEqual(self.data(p)["state"], "answered")

    # ---------- executor (EX-106: exactly-once) ----------
    def test_cannot_claim_unapproved(self):
        p = self.new()
        with self.assertRaises(SystemExit):
            ae.main(["claim", p.stem, "--by", "executor"])

    def test_double_claim_impossible(self):
        p = self.new()
        ae.main(["decide", p.stem, "--by", "saravanan-p", "--outcome", "approved", "--now", T0])
        ae.main(["claim", p.stem, "--by", "executor", "--now", NOW(h=1)])
        with self.assertRaises(SystemExit):
            ae.main(["claim", p.stem, "--by", "executor2", "--now", NOW(h=2)])

    def test_artifact_mutation_blocks_execution(self):
        art = ROOT / "company" / "approvals" / "artifact-under-test.txt"
        art.write_text("v1")
        args = ["new", "--gate", "merge-deploy", "--requested-by", "developer",
                "--artifact", "company/approvals/artifact-under-test.txt",
                "--action", "publish artifact", "--now", T0]
        ae.main(args)
        p = [f for f in ae.all_records() if f.suffix == ".md"][-1]
        ae.main(["decide", p.stem, "--by", "saravanan-p", "--outcome", "approved", "--now", T0])
        art.write_text("v2 — mutated after approval")
        with self.assertRaises(SystemExit):
            ae.main(["claim", p.stem, "--by", "executor"])

    def test_complete_exactly_once(self):
        p = self.new()
        ae.main(["decide", p.stem, "--by", "saravanan-p", "--outcome", "approved", "--now", T0])
        ae.main(["claim", p.stem, "--by", "executor", "--now", NOW(h=1)])
        ae.main(["complete", p.stem, "--result", "done", "--now", NOW(h=2)])
        with self.assertRaises(SystemExit):
            ae.main(["complete", p.stem, "--now", NOW(h=3)])
        d = self.data(p)
        self.assertEqual(d["execution"]["result"], "done")

    def test_complete_without_claim_refused(self):
        p = self.new()
        ae.main(["decide", p.stem, "--by", "saravanan-p", "--outcome", "approved", "--now", T0])
        with self.assertRaises(SystemExit):
            ae.main(["complete", p.stem])

    def test_hash_in_quoted_values_survives_roundtrip(self):
        """Regression (EX-107 drill finding): '#' inside quoted values must not
        be treated as a comment — e.g. reason: "merge PR #34"."""
        p = self.new()
        ae.main(["decide", p.stem, "--by", "saravanan-p", "--outcome", "approved",
                 "--reason", "Approved via GitHub merge of PR #34", "--now", T0])
        d = self.data(p)  # re-parse of the saved file must succeed intact
        self.assertIn("PR #34", d["decision"]["reason"])
        self.assertEqual(ae.validate_one(p), [])

    def test_comma_in_quoted_values_survives_roundtrip(self):
        """Regression (APR-20260714-002 corruption): a comma inside a quoted
        value must not split the inline dict — split_top must be quote-aware."""
        reason = ("Approved in-channel: issue #20 comment ('Approved through script') "
                  "by repo owner; commit was not pushed, stamp recorded per rule")
        p = self.new()
        ae.main(["decide", p.stem, "--by", "saravanan-p", "--outcome", "approved",
                 "--reason", reason, "--now", T0])
        d = self.data(p)
        self.assertEqual(d["decision"]["reason"], reason)
        self.assertEqual(set(d["decision"]), {"by", "at", "outcome", "reason", "conditions"})
        self.assertEqual(ae.validate_one(p), [])
        # and the file must be dump/parse stable (the save() roundtrip guard)
        d2, b2 = ae.parse_record(p.read_text())
        self.assertEqual(ae.dump_record(d2, b2), p.read_text())

    def test_artifact_sha_is_checkout_independent(self):
        """Regression (APR-20260714-003): a Windows approver (CRLF checkout)
        and a Linux executor must hash the same logical artifact identically,
        or the exactly-once guard blocks execution of an approved action."""
        f = ae.ROOT / "artifact-sha-probe.txt"
        try:
            f.write_bytes(b"line one\nline two\n")
            lf = ae.artifact_sha(f.name)
            f.write_bytes(b"\xef\xbb\xbfline one\r\nline two\r\n")  # BOM + CRLF
            self.assertEqual(ae.artifact_sha(f.name), lf)
        finally:
            f.unlink(missing_ok=True)

    def test_save_roundtrip_guard_blocks_unstable_write(self):
        """save() must refuse to write a record whose dump doesn't parse back
        to identical text, instead of silently corrupting the file."""
        p = self.new()
        data, body = ae.load(p)
        before = p.read_text()
        data["action"] = "line one\nline two: smuggled key"  # newline breaks line-oriented frontmatter
        with self.assertRaises(ValueError):
            ae.save(p, data, body)
        self.assertEqual(p.read_text(), before)  # file untouched


if __name__ == "__main__":
    unittest.main(verbosity=2)
