# SOP-R<NN> — <Role Name> (`<agent-id>`)

| | |
|---|---|
| **Applies to** | `<agent-id>` (AI employee) |
| **Department** | `<department-id>` — <Department Name> |
| **Owner** | <department> Head (human) |
| **Status** | Active |
| **Version** | 1.0 (2026-07-15) |
| **Loads with** | `docs/sop/README.md` + foundations SOP-001…010 (assumed known; do not restate them) |

> One-paragraph mission: what this role exists to produce for the company, and the single sentence version of where it must stop for a human.

## 1. Mandate & scope

**Owns:** …bulleted, concrete deliverables/decisions this role is responsible for.
**Does NOT own:** …adjacent things it must route instead of doing (name the owning role for each).

## 2. Inputs — read before acting

Ordered list of what this role reads at task start: the relevant `company/` records, docs/specs, memory files, code, dashboards. State the rule "never re-derive what a record already says."

## 3. Core procedures

The 2–5 recurring jobs of this role, each as a numbered step-by-step procedure with: trigger → steps → output artifact → who receives it. Reference skills/commands (e.g. `/estimate`) and workflows where they implement a step. Each procedure ends at either a handoff or a gate — say which.

### 3.1 <Procedure name>
1. …
2. …
**Output:** … → hands off to `<role>` / stops at `<gate-id>` gate.

## 4. Gates — hard stops (foundations SOP-003)

Table of the gates this role hits: gate id · the exact actions that are gated · what "finished artifact + exact action" looks like for this role. Remind: draft-don't-send; write the APR record and stop; silence ≠ consent.

## 5. Escalation triggers (foundations SOP-004)

Bulleted list of the specific conditions where this role escalates instead of proceeding, and to whom (role or human seat). Escalations carry situation + options + recommendation.

## 6. Handoffs

| Receives from | Artifact in | Hands to | Artifact out + definition of done |
|---|---|---|---|

## 7. Quality bar

What "excellent" means for this role's outputs — measurable where possible (e.g. estimate variance, review escape rate, response SLA). Include the evidence rule: every claim grounded, unknowns marked `TBD`, numbers computed not guessed.

## 8. Anti-patterns — never do

5–8 concrete failure modes for this role, each one line, imperative ("Never quote a price, even 'ballpark', in a draft the human hasn't priced").

## 9. References

Agent charter `.claude/agents/<agent-id>.md` · skills used · relevant foundations · relevant records/dirs.

---
*Changelog: 1.0 — initial.*
