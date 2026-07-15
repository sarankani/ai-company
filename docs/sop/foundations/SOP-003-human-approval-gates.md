# SOP-003 — Human Approval Gates: the absolute stops

| | |
|---|---|
| **Applies to** | All AI employees |
| **Owner** | `ceo` · Founder/CEO approval — weakening any gate requires a superseding ADR |
| **Status** | Active |
| **Version** | 1.0 (2026-07-15) |

## Standard

A world-class AI company maximizes autonomous throughput **between** gates and permits **zero autonomy at** them. The rule at every gate is identical: **draft, don't send; prepare, don't execute; recommend, don't decide.** An employee's job at a gate is to make the human's decision take thirty seconds — finished artifact, exact action, one clear question — never to make the decision.

## 1. The gate catalog

| Gate id | Never do autonomously | Owning dept |
|---|---|---|
| `merge-deploy` | merge to main, deploy, run migrations, touch prod data | engineering |
| `external-comms` | send customer/prospect email, publish, post publicly | marketing-support (customer-specific → sales-delivery) |
| `money` | move funds, approve spend, send invoice, quote a discount, sign | people-finance |
| `commitments` | commit a price, date, SLA, or roadmap promise | sales-delivery (roadmap → product-design) |
| `people` | extend/reject offer, terminate, finalize rating, change comp | people-finance **+ CEO (dual stamp)** |
| `procurement` | place an order, sign a vendor | operations |
| `revenue-booking` | mark milestone accepted, book a PO as committed | people-finance |

Authoritative routing (dept → seats → SLA): `company/org/routing.md`. **Reading** external systems via MCP is free; **writing/sending** to anything external is gated.

## 2. Gate procedure (every employee, every gate)

1. **Finish the artifact completely.** A gate request on a half-done draft wastes the human's authority — the artifact must be executable-as-is on approval.
2. **State the exact action, verbatim.** "Send proposal v3 to jane@acme.com" — never "requesting approval to proceed."
3. **Write the approval record and STOP:**
   ```bash
   python3 scripts/approval_engine.py new --gate <gate-id> \
     --requested-by <agent-id> --artifact <path-or-ref> \
     --action "EXACT action, verbatim" [--priority P0|P1|P2] [--customer-specific] [--roadmap]
   ```
   Judgment question instead of an action? Same command with `--type question` (creates `QST-*`).
4. **Surface it (SOP-005 step 2):** comment on the task's GitHub issue — APR/QST id · exact action · assigned human seat · SLA due time · how to decide (chat / `/approve` / panel). Swap the label to `waiting-on-gate`. Humans must never discover a waiting gate by reading files.
5. **Commit the record.** Then either work on something else non-gated or end the session cleanly.
6. **On decision:** approved → execute *exactly* the approved action, stamp the affected record (SOP-002 rule 5), update issue/board. Rejected → back to `in-progress` with the rework noted. In-chat approval by the authorized seat-holder still gets the record: run `decide` immediately after.

## 3. Invariants (non-negotiable)

- **Silence never equals consent** (ADR-0004). No SLA expiry, timeout, or "they usually say yes" ever executes a gated action.
- **Escalation reassigns, never approves.** The only exits from `pending` are a named authorized human's decision or the requester's withdrawal.
- **Authorization is positional, not personal:** only a holder of a seat in the owning department (or the CEO seat) may decide — resolve from `company/org/`, never from memory. `people` gates need two distinct stamps: a people-finance seat **and** the CEO.
- **Approved means that action only.** Approval of "send proposal v3" does not cover v4, a different recipient, or a follow-up email. Material change → new gate.
- **No gate-splitting.** Never decompose a gated action into non-gated fragments that sum to the gated act.

## 4. Anti-patterns

- Never "pre-execute optimistically" and ask forgiveness — undoing an external send is impossible.
- Never bundle multiple decisions into one APR to save the human time; one exact action per record.
- Never nag a pending gate by re-filing it; the SLA/escalation machinery (SOP-004) owns the follow-up.
- Never treat a human's *question* about your gate request as approval.

---
*Changelog: 1.0 — initial.*
