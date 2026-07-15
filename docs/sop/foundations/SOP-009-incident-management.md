# SOP-009 — Incident Management: when something is on fire

| | |
|---|---|
| **Applies to** | All AI employees and human seat-holders |
| **Owner** | `devops` (content) · Engineering Head approval |
| **Status** | Active |
| **Version** | 1.0 (2026-07-15) |

## Standard

Incidents are where an AI company proves its gates hold under pressure. The rule: **speed inside the gates, never around them.** Detection, diagnosis, drafting the fix, and preparing comms all run at maximum autonomous speed; executing the fix in prod and telling the customer remain human decisions — at P0 the SLA clock just runs faster (2h first response, hourly escalation), it never disappears.

## 1. What counts as an incident

Production down/degraded for a customer · data loss, corruption, or exposure (incl. leaked secrets/PII — see SOP-007) · security breach or active vulnerability being exploited · a wrong external artifact already sent (bad invoice, wrong email, false public claim) · SLA breach on a contractual commitment.

## 2. Response procedure

1. **Declare:** whoever detects it declares — open/annotate the ticket or issue, set `P0` (or `P1` if contained), state impact in one line. Declaring a non-incident is free; missing one is not.
2. **Assign an incident lead:** `devops` for prod/infra, `security` for breaches/exposure, `support` for a single-customer defect, `delivery-manager` for contractual/SLA, `finance` for money sent wrong. The lead owns the timeline until resolution.
3. **Stabilize within your authority:** actions that are reversible and internal (disable a feature flag in staging, pause a queue you own, revoke a draft) — do now. Anything prod-touching, destructive, or external → gate it at `P0` per SOP-003 and escalate the seat-holder chain at the P0 cadence.
4. **Keep a live timeline** on the incident record: timestamped facts as they're learned. Never reconstruct it afterward.
5. **Prepare customer comms in parallel** (support/account-manager drafts; `external-comms` gate to send). The human should never have to choose between fixing and communicating — both are staged for them.
6. **Resolve and verify:** fix applied (human-approved), impact confirmed ended, customer informed (human-approved), record moved to resolved.

## 3. Postmortem (mandatory for P0, default for P1)

Within 3 business days, the incident lead writes a **blameless** postmortem: timeline · impact (computed, not estimated) · root cause (5-whys deep, not "human error"/"AI error") · what limited or worsened the blast radius · corrective actions **as tracked tasks with owners** (SOP-005), not intentions. Filed in `docs/runbooks/` or the incident record; durable lessons → `memory/decisions-log.md`; recurring procedures → a new/updated runbook.

## 4. Anti-patterns

- Never skip a gate because it's urgent — urgency raises the priority, never the autonomy.
- Never hide an incident you caused; self-reported incidents are the cheapest kind.
- Never "quick fix" prod twice: a second emergency change without a postmortem of the first is how outages compound.
- Never write a postmortem that blames a person or an agent instead of the condition that let the mistake through.

---
*Changelog: 1.0 — initial.*
