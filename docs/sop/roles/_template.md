# SOP-R<NN> — <Role Name> (`<agent-id>`)

| | |
|---|---|
| **Applies to** | `<agent-id>` (AI employee) |
| **Department** | `<department-id>` — <Department Name> |
| **Owner** | <department> Head (human) |
| **Status** | Active |
| **Version** | 1.1 (2026-07-15) |
| **Loads with** | `docs/sop/README.md` + foundations SOP-001…014 (assumed known; do not restate them) |

> One-paragraph mission: what this role exists to produce for the company, and the single sentence version of where it must stop for a human.

Every role SOP carries the five mandatory parts (SOP-000 §2a): **Purpose & Scope** (§1) · **Roles & Responsibilities/RACI** (§2) · **Step-by-Step Instructions** (§4) · **Exceptions & Red Flags** (§6) · **KPIs & Metrics** (§8).

## 1. Purpose & scope

**Owns:** …bulleted, concrete deliverables/decisions this role is responsible for.
**Does NOT own:** …adjacent things it must route instead of doing (name the owning role for each).

## 2. Roles & responsibilities (RACI)

RACI for this role's 2–4 key deliverables — who is Responsible (does it), Accountable (answers for it — a human seat for anything gated), Consulted, Informed:

| Deliverable | R | A | C | I |
|---|---|---|---|---|

## 3. Inputs — read before acting

Ordered list of what this role reads at task start: the relevant `company/` records, docs/specs, memory files, code, dashboards. State the rule "never re-derive what a record already says."

## 4. Step-by-step procedures

The 2–5 recurring jobs of this role, each as a numbered step-by-step procedure with: trigger → steps → output artifact → who receives it. Reference skills/commands (e.g. `/estimate`) and workflows where they implement a step. Each procedure ends at either a handoff or a gate — say which.

### 4.1 <Procedure name>
1. …
2. …
**Output:** … → hands off to `<role>` / stops at `<gate-id>` gate.

## 5. Gates — hard stops (foundations SOP-003)

Table of the gates this role hits: gate id · the exact actions that are gated · what "finished artifact + exact action" looks like for this role. Remind: draft-don't-send; write the APR record and stop; silence ≠ consent.

## 6. Exceptions & red flags (foundations SOP-004, SOP-013)

Two lists:
- **Red flags** — anomaly conditions specific to this role's outputs (wrong-customer data, hallucinated fact, off-policy commitment, metric that can't be reproduced…): what to freeze and who to alert. AI-anomaly handling follows SOP-013 §4 (freeze the stream, 100% review until root-caused).
- **Escalation triggers** — the conditions where this role escalates instead of proceeding, and to whom (role or human seat). Escalations carry situation + options + recommendation.

## 7. Handoffs

| Receives from | Artifact in | Hands to | Artifact out + definition of done |
|---|---|---|---|

## 8. KPIs & metrics

3–6 concrete measures of this role's process success — measurable, computed not guessed (SOP-008), reviewable at the HITL sampling cadence (SOP-013). Include at least one *quality* metric (e.g. escaped-defect rate) and one *flow* metric (e.g. cycle time), plus the evidence rule: every claim grounded, unknowns marked `TBD`.

## 9. Anti-patterns — never do

5–8 concrete failure modes for this role, each one line, imperative ("Never quote a price, even 'ballpark', in a draft the human hasn't priced").

## 10. References

Agent charter `.claude/agents/<agent-id>.md` · skills used · relevant foundations · relevant records/dirs.

---
*Changelog: 1.1 — five mandatory parts (RACI, exceptions & red flags, KPIs) per SOP-000 §2a. 1.0 — initial.*
