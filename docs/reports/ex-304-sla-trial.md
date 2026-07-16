# EX-304 — SLA & Routing Trial Report (INTERIM)

**Issue:** [#30](https://github.com/sarankani/ai-company/issues/30) — EX-304 SLA & routing trial
**Author:** data-analyst · **Date:** 2026-07-16 · **Status:** INTERIM — 2-week window still open
**Data cut:** all `APR-*` / `QST-*` records on `main` as of 2026-07-16
**Baselines reconciled against:** `memory/decisions-log.md` (EX-107 / EX-108 / EX-109 entries, 2026-07-13/14)

---

## Purpose & window caveat

EX-304 asks whether the distributed-approver routing + SLA/escalation machinery (ADR-0003/0004, `company/org/routing.md`) behaves correctly under **real** usage: items route to the right human, SLAs are met, breaches escalate (never auto-resolve), and coverage is 100%.

**This is an INTERIM report, not the trial verdict.** The approval loop went live ~2026-07-13; the Control Panel deployed 2026-07-15; today is 2026-07-16. That is **~2–3 days of live data, not the two weeks EX-304 specifies.** Every number below is computed from the records we actually have (n=27: 26 APR + 1 QST). The full-window checklist is at the end. Genuine unknowns are marked TBD — nothing is estimated.

## Method

- Parsed the YAML frontmatter of every record in `company/approvals/*.md` and `company/questions/*.md` (excluding `TEMPLATE.md`) — fields: `department`, `gate`, `priority`, `state`, `created`, `sla_due`, `chain_pos`, `hops[]`, `decision{by,at,outcome}`.
- **Time-to-decision (ttd)** = `decision.at − created` (wall-clock elapsed). For the one dual-approval record (people gate, two stamps) ttd uses the **final** stamp — the moment the item actually left `pending`.
- SLA targets from `routing.md §2`: P0 = 2h wall-clock; P1 = 1 business day; P2 = 3 business days. The "SLA/2 target" is the 50%-SLA reminder threshold (P0 = 1h). **Caveat:** ttd is measured in wall-clock; P1/P2 SLAs run on a business-day clock, so wall-clock ttd is a **conservative upper bound** on true SLA utilisation.
- Script + raw output retained by the analyst; every headline number is reproducible from the records.

---

## 1. Gate volume by department (staffing input for EX-305/306)

| Rank | Department | Records | Gate type | Share |
|---|---|---|---|---|
| 1 | **engineering** | 23 | `merge-deploy` | 85% |
| 2 | marketing-support | 3 | `external-comms` | 11% |
| 3 | people-finance | 1 | `people` | 4% |
| — | all others (sales-delivery, product-design, operations) | 0 | — | 0% |

**Read:** volume is overwhelmingly engineering `merge-deploy` — expected, because the only work running through the loop so far is Evalyn **building itself** (the Control-Panel PRs). This is an artefact of the current phase, **not** a steady-state demand signal. The four zero-volume gates (`money`, `commitments`, `procurement`, `revenue-booking`) have simply had no live business events yet. **Do not size hiring on this distribution** until real customer-facing work (proposals, invoices, POs) starts generating cross-department gates. Ranking today: engineering ≫ marketing-support > people-finance > (everyone else = 0).

## 2. Time-to-decision by priority

| Priority | SLA (routing) | n | Median ttd | Min | Max | Within full SLA | Within SLA/2 |
|---|---|---|---|---|---|---|---|
| P0 | 2h wall-clock | 2 | 7h58m | 1h36m | 14h20m | 1/2 (see note) | 0/2 |
| P1 | 1 business day | 21 | **19m35s** | 10s | 11h15m | 21/21 | 21/21 (< ½ bd) |
| P2 | 3 business days | 4 | 3h45m | 8m40s | 3h46m | 4/4 | 4/4 |
| **All** | — | 27 | **30m26s** | 10s | 14h20m | — | — |

**P0 note — both "misses" are the deliberate escalation drill, not real latency:**
- `APR-20260713-002` (ttd 14h20m) is **EX-108**, a record *intentionally left undecided* to prove the cron escalates a breached P0. Its ttd is a drill artefact, not a routing failure.
- `APR-20260714-003` (ttd 1h36m) decided **within** the 2h full SLA (over the 1h reminder threshold, under the deadline).
- **Excluding the drill, there are zero genuine P0 SLA breaches.**

P1 performance is excellent: median 19m35s against a 1-business-day SLA. The two long P1 tails (`APR-20260714-015` 11h15m, `APR-20260715-004` 5h49m) both spanned overnight / awaited a second dual-approval stamp and still cleared inside a business day. Reconciles with the EX-109 baseline (first decision 34m39s = 2.4% of P1 SLA).

## 3. Escalations / hops

| Records with ≥1 hop | 1 of 27 (3.7%) |
|---|---|

| Record | Pri | Hop | Reason | When |
|---|---|---|---|---|
| APR-20260713-002 | P0 | saravanan-p → saran | `sla-breach` | 2026-07-14T05:50:34Z |

Only one hop occurred — the **EX-108 drill**, where the scheduled job autonomously moved a breached P0 one step along the chain and the item **stayed `pending`** (ADR-0004 held: escalation reassigns, never decides). No `unavailable-skip` or `manual-delegate` hops fired in live traffic. The mechanism is proven but **thinly exercised** — 1 real hop is not enough to certify escalation under load.

## 4. Terminal-SLA breaches (chain exhausted, unanswered)

**Zero.** No record exhausted the escalation chain without a decision. `pending` count = 0; every record reached a terminal state (`approved` / `rejected` / `answered`). ADR-0004's invariant — the only exits from `pending` are a named human's decision or withdrawal, never an auto-resolve — held across all 27 records.

## 5. Rejection rate by department

| Department | Rejected / decided | Rate | Read |
|---|---|---|---|
| engineering | 1 / 23 | 4% | The single rejection is the **EX-108 drill** ("drill complete"), not a content judgment. Genuine content rejections = **0/22** → possible rubber-stamp smell **(see below)** |
| marketing-support | 1 / 3 | 33% | **Healthy** — `APR-20260715-002`, the honesty-bar rejection of the "zero humans, never a mistake" tagline (operating principle 4). The gate demonstrably rejects unbackable claims. |
| people-finance | 0 / 1 | 0% | n=1, not interpretable |

**Rubber-stamping check (not auto-scored as a pass):** engineering has ~0% genuine rejections across 22 real merge approvals. On its face that is a rubber-stamp risk. **Mitigating context:** these are Evalyn's own well-tested build PRs with green CI and code-review self-passes — a low-adversarial internal pipeline where high approval is plausible. **But** it is *not confirmed healthy*: with a single human holding every engineering seat (n=1), approve-your-own-work has no independent second pair of eyes. The confounder (self-built code) and the control weakness (n=1 seat) both point the same way — this needs the EX-305/306 hire to create real reviewer separation before we can call engineering's 0% "clean." The marketing honesty-bar rejection is the positive proof that the gate *can and does* say no when content warrants it.

## 6. Coverage

- **100%** of decided items (27/27) carry a named human decider (`saran` or `saravanan-p`) — no item resolved without a human stamp.
- Every hop that occurred (1) is recorded in-record with from/to/reason/timestamp — full auditability.
- Every decision maps to a human holding an authorized seat in the item's department (or CEO backstop) per `routing.md §4`. The one dual-approval `people` record carries two distinct stamps as required.
- No item was ever left unassigned.

---

## Findings & risks

1. **The machinery works on the evidence we have.** Correct routing, 0 terminal breaches, 100% human coverage, a clean escalation drill, and a real honesty-bar rejection. On these ~2–3 days, the loop behaves exactly as ADR-0003/0004 specify.
2. **Volume is not representative.** 85% engineering / self-build traffic. Four of seven gate types (`money`, `commitments`, `procurement`, `revenue-booking`) have **zero** live events. Any staffing decision from this distribution would be premature — flagged for EX-305/306.
3. **Escalation is under-exercised.** Exactly one hop, and it was a scripted drill. `unavailable-skip` and `manual-delegate` paths have **never** fired in live traffic. Proven-in-principle ≠ proven-under-load.
4. **n=1 human confounds two metrics.** Every decision and every escalation lands on the same person (Saran holds all seats). Escalation "reassignment" has no distinct human to reassign *to*, and engineering's 0% genuine-rejection rate can't be read as independent review. The trial's real value arrives only with the second hire.
5. **P1 latency is the standout positive** — median 19m35s vs a 1-business-day SLA, consistent with the EX-109 baseline.
6. **No data-quality blockers.** All 27 records parsed cleanly; timestamps, states, and stamps are internally consistent and reconcile with `memory/decisions-log.md`. No PII exposed in this report.

## To close the trial (what the full 2-week window still needs)

- [ ] **Reach the 2-week window** (target ~2026-07-27) — current data is ~2–3 days. **TBD until elapsed.**
- [ ] **Cross-department volume** — at least one live event on each of the four zero-volume gates (`money`, `commitments`, `procurement`, `revenue-booking`) so routing is tested beyond `merge-deploy`.
- [ ] **A non-drill escalation** — a real `sla-breach` hop and, ideally, an `unavailable-skip` (a human toggling OOO with a pending item) and a `manual-delegate`, in live traffic.
- [ ] **A second seated human** (EX-305/306) so escalation reassigns across *distinct* people and rejection independence becomes real — resolves finding #4.
- [ ] **≥1 genuine content rejection in engineering** (or a documented rationale for why merge approvals are legitimately ~100%) to clear the rubber-stamp flag.
- [ ] **Sustained 0 terminal breaches** and **100% coverage** across the full window (currently holding).
- [ ] Re-run this analysis at window close and issue the **final EX-304 verdict** (pass/fail) with the same six metrics.

---

## Handoffs

- **Staffing input (§1 volume ranking)** → EX-305/306 / `hr` — but tagged "not representative yet."
- **Rubber-stamp flag (§5)** → `eng-manager` / `code-reviewer` for review-independence.
- **Company-metric summary** → `ceo` at window close with the final verdict.

*Method note: computed with code from the record frontmatter; all figures reproducible. Baselines cited from `memory/decisions-log.md` (EX-107/108/109).*
