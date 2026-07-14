#!/usr/bin/env python3
"""Evalyn approval-record engine (Phase 1 — file-based loop, zero UI).

Implements Tech Spec 001 §2-§6 over plain files in company/:
  new       create an approval/question record, routed per company/org/
  validate  schema-check records (CI gate); --against-git enforces append-only
  scan      SLA/escalation pass: skip unavailable humans, hop on breach,
            queue notifications (idempotent), rebuild the registry index
  decide    stamp a human decision (authorization enforced; dual-approval aware)
  delegate  reassign to another authorized human (hop: manual-delegate)
  claim     executor claim on an approved record (exactly-once protocol)
  complete  stamp executed_at after the claimed action was performed

Stdlib only. Frontmatter is a strict YAML subset owned by this tool:
  key: scalar
  key:
    - {k: v, k2: v2}
Invariant (ADR-0004): nothing in this file ever sets state=approved/rejected —
only `decide`, with a named human, does. Escalation only reassigns.
"""
import argparse
import hashlib
import json
import os
import re
import smtplib
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ORG = ROOT / "company" / "org"
APPROVALS = ROOT / "company" / "approvals"
QUESTIONS = ROOT / "company" / "questions"
REGISTRY = ROOT / "company" / "registry.md"

GATES = ["merge-deploy", "external-comms", "money", "commitments",
         "people", "procurement", "revenue-booking"]
DEPARTMENTS = ["leadership", "people-finance", "product-design", "engineering",
               "sales-delivery", "marketing-support", "operations"]
GATE_DEPT = {
    "merge-deploy": "engineering",
    "external-comms": "marketing-support",
    "money": "people-finance",
    "commitments": "sales-delivery",
    "people": "people-finance",
    "procurement": "operations",
    "revenue-booking": "people-finance",
}
DUAL_GATES = {"people"}  # requires a department stamp AND a ceo stamp
PRIORITIES = {
    # first-response SLA, escalation cadence, business-day clock?
    "P0": (timedelta(hours=2), timedelta(hours=1), False),
    "P1": (timedelta(days=1), timedelta(days=1), True),
    "P2": (timedelta(days=3), timedelta(days=3), True),
}
STATES = ["pending", "approved", "rejected", "answered", "withdrawn"]
TERMINAL = {"approved", "rejected", "answered", "withdrawn"}
CHAIN = ["approver", "deputy", "head"]  # then: ceo (terminal backstop)

REQUIRED_KEYS = ["id", "type", "state", "gate", "department", "priority",
                 "requested_by", "artifact", "action", "created", "sla_due",
                 "assignee", "chain_pos", "hops", "notified", "stamps"]


# ---------- time ----------

def now_utc():
    return datetime.now(timezone.utc).replace(microsecond=0)


def iso(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_iso(s):
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def add_business_delta(start, delta):
    """Advance by delta counting only Mon-Fri days (hours preserved)."""
    days = delta.days
    cur = start
    while days > 0:
        cur += timedelta(days=1)
        if cur.weekday() < 5:
            days -= 1
    # skip weekend landing for the residual part
    cur += (delta - timedelta(days=delta.days))
    while cur.weekday() >= 5:
        cur += timedelta(days=1)
    return cur


def sla_due_from(start, priority, cadence=False):
    first, esc, business = PRIORITIES[priority]
    delta = esc if cadence else first
    return add_business_delta(start, delta) if business else start + delta


# ---------- frontmatter (strict subset) ----------

def parse_inline_dict(s):
    s = s.strip()
    assert s.startswith("{") and s.endswith("}"), f"bad inline dict: {s}"
    out = {}
    for part in split_top(s[1:-1]):
        k, _, v = part.partition(":")
        out[k.strip()] = coerce(v.strip())
    return out


def split_top(s):
    """Split on top-level commas only — never inside quotes or nested braces."""
    parts, depth, cur, quoted = [], 0, "", False
    for ch in s:
        if ch == '"':
            quoted = not quoted
        elif ch == "{" and not quoted:
            depth += 1
        elif ch == "}" and not quoted:
            depth -= 1
        if ch == "," and depth == 0 and not quoted:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        parts.append(cur)
    return parts


def coerce(v):
    if v in ("null", "", "~"):
        return None
    if v.isdigit():
        return int(v)
    if v.startswith('"') and v.endswith('"'):
        return v[1:-1]
    return v


def dump_val(v):
    if v is None:
        return "null"
    if isinstance(v, int):
        return str(v)
    s = str(v)
    if s == "":
        return '""'  # bare empty means "start of a list" to the parser
    if any(c in s for c in ":,{}#") or s != s.strip():
        return '"' + s.replace('"', "'") + '"'
    return s


def strip_comment(v):
    """Drop a trailing ' # comment' only when outside quotes and braces."""
    depth, quoted = 0, False
    for i, ch in enumerate(v):
        if ch == '"':
            quoted = not quoted
        elif ch == "{" and not quoted:
            depth += 1
        elif ch == "}" and not quoted:
            depth -= 1
        elif ch == "#" and not quoted and depth == 0 and i > 0 and v[i - 1] == " ":
            return v[:i]
    return v


def parse_record(text):
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
    if not m:
        raise ValueError("no frontmatter block")
    fm, body = m.group(1), m.group(2)
    data, cur_list = {}, None
    for line in fm.splitlines():
        if not line.strip() or line.strip().startswith("#"):
            continue
        if line.startswith("  - "):
            if cur_list is None:
                raise ValueError(f"list item outside list: {line}")
            data[cur_list].append(parse_inline_dict(line[4:]))
        else:
            k, _, v = line.partition(":")
            k, v = k.strip(), strip_comment(v).strip()
            if v == "":
                data[k] = []
                cur_list = k
            else:
                data[k] = parse_inline_dict(v) if v.startswith("{") else coerce(v)
                cur_list = None
    return data, body


def dump_record(data, body):
    lines = ["---"]
    for k, v in data.items():
        if isinstance(v, list):
            lines.append(f"{k}:")
            for item in v:
                inner = ", ".join(f"{ik}: {dump_val(iv)}" for ik, iv in item.items())
                lines.append("  - {" + inner + "}")
        elif isinstance(v, dict):
            inner = ", ".join(f"{ik}: {dump_val(iv)}" for ik, iv in v.items())
            lines.append(f"{k}: {{{inner}}}")
        else:
            lines.append(f"{k}: {dump_val(v)}")
    lines.append("---")
    return "\n".join(lines) + "\n" + body


def load(path):
    data, body = parse_record(Path(path).read_text())
    return data, body


def save(path, data, body):
    text = dump_record(data, body)
    # Roundtrip guard: refuse to write anything the parser can't read back to
    # the exact same text (this bug class — quote-unaware parsing — has now
    # corrupted records on disk twice; fail loudly instead of writing garbage).
    d2, b2 = parse_record(text)
    if dump_record(d2, b2) != text or set(d2) != set(data):
        raise ValueError(f"roundtrip guard: dump/parse not stable for {path}; refusing to write")
    Path(path).write_text(text)


# ---------- org ----------

def load_humans():
    humans = {}
    for f in sorted((ORG / "humans").glob("*.md")):
        d, _ = parse_record(f.read_text())
        humans[d["id"]] = d
    return humans


def seat_holders(humans, department, seat):
    return [h for h in humans.values()
            if any(r.get("department") == department and r.get("seat") == seat
                   for r in h.get("roles", []))]


def available(h):
    return h.get("availability") == "available"


def resolve_department(gate, customer_specific=False, roadmap=False):
    if gate == "external-comms" and customer_specific:
        return "sales-delivery"
    if gate == "commitments" and roadmap:
        return "product-design"
    return GATE_DEPT[gate]


def resolve_assignee(humans, department, start_pos=0):
    """First available seat-holder from chain position start_pos; ceo terminal."""
    for pos in range(start_pos, len(CHAIN)):
        for h in seat_holders(humans, department, CHAIN[pos]):
            if available(h):
                return h["id"], pos
    ceos = seat_holders(humans, "leadership", "ceo")
    return (ceos[0]["id"] if ceos else "UNASSIGNED"), len(CHAIN)  # ceo even if busy: terminal backstop


def authorized(humans, human_id, department):
    h = humans.get(human_id)
    if not h:
        return False
    roles = h.get("roles", [])
    if any(r.get("seat") == "ceo" for r in roles):
        return True
    return any(r.get("department") == department for r in roles)


# ---------- records ----------

def record_dir(rtype):
    return APPROVALS if rtype == "approval" else QUESTIONS


def next_id(rtype, when):
    prefix = "APR" if rtype == "approval" else "QST"
    stamp = when.strftime("%Y%m%d")
    d = record_dir(rtype)
    d.mkdir(parents=True, exist_ok=True)
    seq = 1
    for f in d.glob(f"{prefix}-{stamp}-*.md"):
        m = re.match(rf"{prefix}-{stamp}-(\d+)", f.stem)
        if m:
            seq = max(seq, int(m.group(1)) + 1)
    return f"{prefix}-{stamp}-{seq:03d}"


def artifact_sha(ref):
    p = ROOT / ref
    if p.is_file():
        # Normalize CRLF and a UTF-8 BOM so the hash is checkout-independent:
        # a Windows approver (core.autocrlf) and a Linux executor must compute
        # the same sha for the same logical content (APR-20260714-003 lesson).
        content = p.read_bytes().removeprefix(b"\xef\xbb\xbf").replace(b"\r\n", b"\n")
        return hashlib.sha256(content).hexdigest()[:16]
    return "external"  # non-file artifact (PR url etc.) — verified by reviewer


def all_records():
    out = []
    for d in (APPROVALS, QUESTIONS):
        if d.exists():
            for f in sorted(d.glob("*.md")):
                if f.stem != "TEMPLATE":
                    out.append(f)
    return out


# ---------- commands ----------

def cmd_new(a):
    when = parse_iso(a.now) if a.now else now_utc()
    humans = load_humans()
    dept = resolve_department(a.gate, a.customer_specific, a.roadmap)
    assignee, pos = resolve_assignee(humans, dept)
    rid = next_id(a.type, when)
    data = {
        "id": rid, "type": a.type, "state": "pending",
        "gate": a.gate, "department": dept, "priority": a.priority,
        "requested_by": a.requested_by, "artifact": a.artifact,
        "artifact_sha": artifact_sha(a.artifact),
        "action": a.action,
        "links": a.links or "",
        "created": iso(when), "sla_due": iso(sla_due_from(when, a.priority)),
        "assignee": assignee, "chain_pos": pos,
        "hops": [], "notified": [], "stamps": [],
        "decision": None, "execution": None,
    }
    body = (f"\n## Summary\n\n{a.summary or a.action}\n\n"
            f"## Decision\n\n_pending — authorized seat: {dept} (assignee: {assignee})_\n\n"
            f"## Thread\n\n")
    path = record_dir(a.type) / f"{rid}.md"
    save(path, data, body)
    rebuild_registry()
    print(f"{rid} -> {dept} / {assignee} (sla_due {data['sla_due']})")
    return 0


def validate_one(path, against_git=False):
    errs = []
    try:
        data, _ = load(path)
    except Exception as e:
        return [f"{path}: unparseable frontmatter: {e}"]
    for k in REQUIRED_KEYS:
        if k not in data:
            errs.append(f"{path}: missing key '{k}'")
    checks = [("type", ["approval", "question"]), ("state", STATES),
              ("gate", GATES), ("department", DEPARTMENTS),
              ("priority", list(PRIORITIES))]
    for key, allowed in checks:
        if key in data and data[key] not in allowed:
            errs.append(f"{path}: {key}='{data[key]}' not in {allowed}")
    if data.get("type") == "question" and data.get("state") in ("approved", "rejected"):
        errs.append(f"{path}: questions resolve with 'answered', not '{data['state']}'")
    if data.get("state") == "rejected":
        stamps = data.get("stamps", [])
        if not any(s.get("outcome") == "rejected" and s.get("reason") for s in stamps):
            errs.append(f"{path}: rejected without a reasoned stamp")
    if data.get("execution") and data.get("state") != "approved":
        errs.append(f"{path}: execution present but state != approved")
    if against_git:
        try:
            rel = str(Path(path).resolve().relative_to(ROOT))
            old = subprocess.run(["git", "show", f"HEAD:{rel}"], cwd=ROOT,
                                 capture_output=True, text=True)
            if old.returncode == 0:
                odata, _ = parse_record(old.stdout)
                for fld in ("hops", "notified", "stamps"):
                    if odata.get(fld) and data.get(fld, [])[:len(odata[fld])] != odata[fld]:
                        errs.append(f"{path}: append-only field '{fld}' was rewritten")
        except Exception as e:
            errs.append(f"{path}: git check failed: {e}")
    return errs


def cmd_validate(a):
    paths = a.paths or [str(p) for p in all_records()]
    errs = []
    for p in paths:
        errs += validate_one(p, a.against_git)
    for e in errs:
        print(f"INVALID: {e}", file=sys.stderr)
    print(f"validated {len(paths)} record(s): {'FAIL' if errs else 'OK'}")
    return 1 if errs else 0


def already_notified(data, kind, to, ref=None):
    return any(n.get("kind") == kind and n.get("to") == to and
               (ref is None or n.get("ref") == ref)
               for n in data.get("notified", []))


def cmd_scan(a):
    when = parse_iso(a.now) if a.now else now_utc()
    humans = load_humans()
    outbox, changed = [], []
    for path in all_records():
        data, body = load(path)
        if data.get("state") != "pending":
            continue
        dirty = False
        dept, prio = data["department"], data["priority"]
        due = parse_iso(data["sla_due"])
        cur_assignee = data["assignee"]
        cur_h = humans.get(cur_assignee, {})
        pos = int(data.get("chain_pos", 0))
        terminal = pos >= len(CHAIN)
        # 1) unavailability skip (immediate) or SLA breach (one hop)
        reason = None
        if not terminal and cur_h and not available(cur_h):
            reason = "unavailable"
        elif when >= due and not terminal:
            reason = "sla-breach"
        if reason:
            new_assignee, new_pos = resolve_assignee(humans, dept, pos + 1)
            data["hops"].append({"at": iso(when), "from": cur_assignee,
                                 "to": new_assignee, "reason": reason})
            data["assignee"], data["chain_pos"] = new_assignee, new_pos
            data["sla_due"] = iso(sla_due_from(when, prio, cadence=True))
            for to in dict.fromkeys([cur_assignee, new_assignee]):
                outbox.append((data, to, "escalated", iso(when)))
            dirty = True
        else:
            # 2) assignment notification (once per assignee)
            if not already_notified(data, "assigned", cur_assignee):
                outbox.append((data, cur_assignee, "assigned", data["sla_due"]))
                dirty = True
            # 3) 50% SLA warning (once per sla_due value)
            created = parse_iso(data["hops"][-1]["at"]) if data["hops"] else parse_iso(data["created"])
            half = created + (due - created) / 2
            if when >= half and not already_notified(data, "sla-warning", cur_assignee, data["sla_due"]):
                outbox.append((data, cur_assignee, "sla-warning", data["sla_due"]))
                dirty = True
        if dirty:
            changed.append((path, data, body))
    # send + log notifications (append AFTER successful send; send=False just
    # logs). Slack shares the email idempotency log — one notified entry per
    # (kind, to, ref), so job re-runs never double-send (EX-303 AC).
    for data, to, kind, ref in outbox:
        sent_email = send_email(humans, data, to, kind, a.send_email)
        sent_slack, ts = send_slack(humans, data, to, kind,
                                    last_slack_ts(data, to), a.send_slack)
        if sent_email or sent_slack:
            entry = {"at": iso(when), "to": to, "kind": kind, "ref": ref}
            if ts:
                entry["slack_ts"] = ts
            data["notified"].append(entry)
    for path, data, body in changed:
        save(path, data, body)
    rebuild_registry()
    print(f"scan: {len(changed)} record(s) updated, {len(outbox)} notification(s)"
          f" ({'sent' if a.send_email else 'queued/logged'})")
    return 0


def send_email(humans, data, to_id, kind, really):
    h = humans.get(to_id)
    if not h or not h.get("email"):
        return False
    subject = f"[Evalyn {kind}] {data['id']} · {data['gate']} · {data['priority']}"
    text = (f"{kind.upper()} — {data['id']}\n"
            f"Gate: {data['gate']}  Department: {data['department']}\n"
            f"Requested by: {data['requested_by']}\n"
            f"Exact action: {data['action']}\n"
            f"SLA due: {data['sla_due']}\n"
            f"Record: company/{'approvals' if data['type']=='approval' else 'questions'}/{data['id']}.md\n"
            f"Decide: python3 scripts/approval_engine.py decide {data['id']} "
            f"--by <your-id> --outcome approved|rejected|answered [--reason ...]\n")
    if not really:
        print(f"  [dry-run email] to={h['email']} :: {subject}")
        return True
    host = os.environ.get("SMTP_HOST")
    if not host:
        print(f"  [skip email] SMTP_HOST not set; would send to {h['email']}: {subject}")
        return False
    msg = EmailMessage()
    msg["From"] = os.environ.get("NOTIFY_FROM", "evalyn-approvals@localhost")
    msg["To"] = h["email"]
    msg["Subject"] = subject
    msg.set_content(text)
    with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", "587"))) as s:
        s.starttls()
        user = os.environ.get("SMTP_USER")
        if user:
            s.login(user, os.environ["SMTP_PASS"])
        s.send_message(msg)
    return True


# ---------- Slack notifications (EX-303) ----------

def record_link(data):
    """Deep link into the panel item (auth-gated — an unauthenticated click
    hits sign-in, then lands on the item) if PANEL_BASE_URL is set; else the
    record file on GitHub."""
    base = os.environ.get("PANEL_BASE_URL")
    if base:
        return f"{base.rstrip('/')}/item/{data['id']}"
    repo = os.environ.get("GITHUB_REPOSITORY", "sarankani/ai-company")
    folder = "approvals" if data["type"] == "approval" else "questions"
    return f"https://github.com/{repo}/blob/main/company/{folder}/{data['id']}.md"


def slack_message(data, to_id, kind):
    """Slack mrkdwn for a gate event, with a deep link to the exact item."""
    emoji = {"assigned": "\U0001F4E5", "sla-warning": "⏳",
             "escalated": "⚠️"}.get(kind, "\U0001F514")
    label = kind.replace("-", " ").title()
    return (f"{emoji} *{label}* — <{record_link(data)}|{data['id']}>\n"
            f"*Gate:* {data['gate']}   *Dept:* {data['department']}   *Priority:* {data['priority']}\n"
            f"*Action:* {data['action']}\n"
            f"*Assignee:* {to_id}   *SLA due:* {data['sla_due']}")


def _http_post_json(url, payload, headers):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=10) as r:
        body = r.read().decode() or "{}"
    return json.loads(body) if body.strip().startswith("{") else {"ok": True, "raw": body}


def last_slack_ts(data, to_id):
    """Most recent Slack thread ts sent to this human for this record — used to
    thread SLA-warning/escalation under the original assignment (UC2)."""
    for n in reversed(data.get("notified", [])):
        if n.get("to") == to_id and n.get("slack_ts"):
            return n["slack_ts"]
    return None


def send_slack(humans, data, to_id, kind, thread_ts, really):
    """Post a gate event to Slack. Returns (delivered, thread_ts). Prefers a DM
    to the assignee (SLACK_BOT_TOKEN + the human's slack_id) with threading;
    falls back to the channel webhook (SLACK_WEBHOOK_URL, no threading). Never
    raises — Slack being down must not break routing (UC3: email still fires)."""
    token = os.environ.get("SLACK_BOT_TOKEN")
    webhook = os.environ.get("SLACK_WEBHOOK_URL")
    slack_id = (humans.get(to_id) or {}).get("slack_id")
    text = slack_message(data, to_id, kind)
    if not really:
        print(f"  [dry-run slack] to={to_id} kind={kind} :: {data['id']}")
        return True, thread_ts
    try:
        if token and slack_id:  # DM the human, threaded
            payload = {"channel": slack_id, "text": text}
            if thread_ts:
                payload["thread_ts"] = thread_ts
            resp = _http_post_json(
                "https://slack.com/api/chat.postMessage", payload,
                {"Authorization": f"Bearer {token}",
                 "Content-Type": "application/json; charset=utf-8"})
            if resp.get("ok"):
                return True, resp.get("ts", thread_ts)
            print(f"  [slack error] chat.postMessage: {resp.get('error')}")
            return False, thread_ts
        if webhook:  # channel post (no per-message threading via webhooks)
            _http_post_json(webhook, {"text": text}, {"Content-Type": "application/json"})
            return True, thread_ts
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        print(f"  [slack skip] {e}")
        return False, thread_ts
    print(f"  [skip slack] no SLACK_WEBHOOK_URL and no bot DM target for {to_id}")
    return False, thread_ts


def find_record(rid):
    for f in all_records():
        if f.stem == rid:
            return f
    raise SystemExit(f"record {rid} not found")


def cmd_decide(a):
    when = parse_iso(a.now) if a.now else now_utc()
    humans = load_humans()
    path = find_record(a.id)
    data, body = load(path)
    if data["state"] != "pending":
        raise SystemExit(f"{a.id} is '{data['state']}', not pending")
    if not authorized(humans, a.by, data["department"]):
        raise SystemExit(f"{a.by} holds no seat in {data['department']} (and is not ceo) — refused")
    if a.outcome == "rejected" and not a.reason:
        raise SystemExit("reject requires --reason")
    if data["type"] == "question" and a.outcome != "answered":
        raise SystemExit("questions are resolved with --outcome answered")
    if data["type"] == "approval" and a.outcome == "answered":
        raise SystemExit("approvals are resolved with approved/rejected")
    stamp = {"by": a.by, "at": iso(when), "outcome": a.outcome,
             "reason": a.reason or "", "conditions": a.conditions or ""}
    data["stamps"].append(stamp)
    # dual approval: people gate needs a department stamp AND a ceo-seat stamp
    def is_ceo(hid):
        return any(r.get("seat") == "ceo" for r in humans.get(hid, {}).get("roles", []))
    done = True
    if a.outcome == "approved" and data["gate"] in DUAL_GATES:
        oks = [s for s in data["stamps"] if s["outcome"] == "approved"]
        ceo_stampers = [s["by"] for s in oks if is_ceo(s["by"])]
        dept_ids = {h["id"] for seat in CHAIN for h in seat_holders(humans, data["department"], seat)}
        dept_stampers = [s["by"] for s in oks if s["by"] in dept_ids]
        have_ceo = bool(ceo_stampers)
        have_dept = bool(dept_stampers)
        # two stamps required: one satisfying the department, one the ceo seat.
        # EX-206 M3: they must be DISTINCT humans once ≥2 humans are qualified
        # to approve this gate; at n=1 the same human co-signs (EX-008 note b),
        # else the gate is unsatisfiable. Separation of duties auto-enables on
        # hire. Keep this in lockstep with panel/lib/engine.ts.
        qualified = {h["id"] for h in humans.values()
                     if is_ceo(h["id"]) or h["id"] in dept_ids}
        distinct_ok = (len(qualified) <= 1
                       or any(c != d for c in ceo_stampers for d in dept_stampers))
        done = have_ceo and have_dept and len(oks) >= 2 and distinct_ok
    if done:
        data["state"] = a.outcome
        data["decision"] = stamp
        if a.outcome == "approved":
            data["approved_artifact_sha"] = artifact_sha(data["artifact"])
        body = body.replace("_pending — authorized seat:",
                            f"**{a.outcome}** by {a.by} at {iso(when)}"
                            + (f" — {a.reason}" if a.reason else "") + "\n\n_was pending — seat:")
    else:
        print(f"{a.id}: stamp recorded ({a.by}); dual-approval still needs the second stamp")
    save(path, data, body)
    rebuild_registry()
    print(f"{a.id}: {data['state']}" + ("" if done else " (pending second stamp)"))
    return 0


def cmd_delegate(a):
    when = parse_iso(a.now) if a.now else now_utc()
    humans = load_humans()
    path = find_record(a.id)
    data, body = load(path)
    if data["state"] != "pending":
        raise SystemExit(f"{a.id} is '{data['state']}', not pending")
    for who, label in ((a.by, "delegator"), (a.to, "delegate")):
        if not authorized(humans, who, data["department"]):
            raise SystemExit(f"{who} ({label}) not authorized for {data['department']} — refused")
    data["hops"].append({"at": iso(when), "from": data["assignee"], "to": a.to,
                         "reason": "manual-delegate"})
    data["assignee"] = a.to
    save(path, data, body)
    rebuild_registry()
    print(f"{a.id}: delegated to {a.to}")
    return 0


def cmd_claim(a):
    when = parse_iso(a.now) if a.now else now_utc()
    path = find_record(a.id)
    data, body = load(path)
    if data["state"] != "approved":
        raise SystemExit(f"cannot claim {a.id}: state is '{data['state']}', not approved")
    if data.get("execution"):
        raise SystemExit(f"cannot claim {a.id}: already claimed at "
                         f"{data['execution'].get('claimed_at')} by {data['execution'].get('by')}")
    cur = artifact_sha(data["artifact"])
    approved_sha = data.get("approved_artifact_sha", cur)
    if cur != approved_sha:
        raise SystemExit(f"ARTIFACT CHANGED since approval ({approved_sha} -> {cur}): "
                         f"execution blocked — withdraw and re-request approval (Tech Spec 001 §6)")
    data["execution"] = {"claimed_at": iso(when), "by": a.by,
                         "executed_at": None, "result": None}
    save(path, data, body)
    print(f"{a.id}: claimed by {a.by}. Perform EXACTLY this action, then run "
          f"'complete':\n  {data['action']}")
    return 0


def cmd_complete(a):
    when = parse_iso(a.now) if a.now else now_utc()
    path = find_record(a.id)
    data, body = load(path)
    ex = data.get("execution")
    if not ex or not ex.get("claimed_at"):
        raise SystemExit(f"{a.id}: no claim on record — claim before complete")
    if ex.get("executed_at"):
        raise SystemExit(f"{a.id}: already executed at {ex['executed_at']}")
    ex["executed_at"] = iso(when)
    ex["result"] = a.result or "done"
    save(path, data, body)
    rebuild_registry()
    print(f"{a.id}: executed exactly once ({ex['executed_at']})")
    return 0


# ---------- registry ----------

BEGIN = "<!-- approvals:begin -->"
END = "<!-- approvals:end -->"


def rebuild_registry():
    if not REGISTRY.exists():
        return
    rows = []
    for f in all_records():
        d, _ = load(f)
        if d.get("state") == "pending" or (d.get("state") == "approved" and not (
                d.get("execution") or {}).get("executed_at")):
            rows.append(f"| {d['id']} | {d['type']} | {d['gate']} | {d['department']} "
                        f"| {d['state']} | {d['assignee']} | {d['sla_due']} |")
    table = ("| id | type | gate | department | state | assignee | sla_due |\n"
             "|---|---|---|---|---|---|---|\n" +
             ("\n".join(rows) if rows else "| — | — | — | — | — | — | — |"))
    text = REGISTRY.read_text()
    if BEGIN in text:
        text = re.sub(re.escape(BEGIN) + ".*?" + re.escape(END),
                      BEGIN + "\n" + table + "\n" + END, text, flags=re.S)
    else:
        text = text.replace(
            "## Approvals & questions (open items)",
            "## Approvals & questions (open items)\n\n" + BEGIN + "\n" + table + "\n" + END, 1)
        # drop the old placeholder table if present
        text = re.sub(r"\n\| id \| type \| gate \| department \| state \| assignee \| sla_due \|"
                      r"\n\|[-| ]+\|\n\| — \| — \| — \| — \| — \| — \| — \|\n"
                      r"\n\*No open items[^\n]*\n", "\n", text)
    REGISTRY.write_text(text)


# ---------- cli ----------

def main(argv=None):
    p = argparse.ArgumentParser(prog="approval_engine")
    sub = p.add_subparsers(dest="cmd", required=True)

    n = sub.add_parser("new")
    n.add_argument("--type", choices=["approval", "question"], default="approval")
    n.add_argument("--gate", required=True, choices=GATES)
    n.add_argument("--priority", default="P1", choices=list(PRIORITIES))
    n.add_argument("--requested-by", required=True)
    n.add_argument("--artifact", required=True)
    n.add_argument("--action", required=True)
    n.add_argument("--summary", default="")
    n.add_argument("--links", default="")
    n.add_argument("--customer-specific", action="store_true")
    n.add_argument("--roadmap", action="store_true")
    n.add_argument("--now")
    n.set_defaults(fn=cmd_new)

    v = sub.add_parser("validate")
    v.add_argument("paths", nargs="*")
    v.add_argument("--against-git", action="store_true")
    v.set_defaults(fn=cmd_validate)

    s = sub.add_parser("scan")
    s.add_argument("--send-email", action="store_true")
    s.add_argument("--send-slack", action="store_true")
    s.add_argument("--now")
    s.set_defaults(fn=cmd_scan)

    d = sub.add_parser("decide")
    d.add_argument("id")
    d.add_argument("--by", required=True)
    d.add_argument("--outcome", required=True, choices=["approved", "rejected", "answered"])
    d.add_argument("--reason", default="")
    d.add_argument("--conditions", default="")
    d.add_argument("--now")
    d.set_defaults(fn=cmd_decide)

    g = sub.add_parser("delegate")
    g.add_argument("id")
    g.add_argument("--by", required=True)
    g.add_argument("--to", required=True)
    g.add_argument("--now")
    g.set_defaults(fn=cmd_delegate)

    c = sub.add_parser("claim")
    c.add_argument("id")
    c.add_argument("--by", required=True)
    c.add_argument("--now")
    c.set_defaults(fn=cmd_claim)

    x = sub.add_parser("complete")
    x.add_argument("id")
    x.add_argument("--result", default="")
    x.add_argument("--now")
    x.set_defaults(fn=cmd_complete)

    a = p.parse_args(argv)
    return a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
