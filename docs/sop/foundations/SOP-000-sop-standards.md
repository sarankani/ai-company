# SOP-000 — SOP Standards: how Standard Operating Procedures work here

| | |
|---|---|
| **Applies to** | Everyone — all AI employees, all human seat-holders |
| **Owner** | `ceo` (content) · Founder/CEO (approval) |
| **Status** | Active |
| **Version** | 1.0 (2026-07-15) |

## 1. Purpose

SOPs are the executable operating knowledge of the company. An AI employee loaded with its role SOP plus the foundations must be able to do its job correctly **without asking how the company works** — only genuine judgment calls should ever leave the procedure. For humans, SOPs are the contract of what the AI workforce will and will not do autonomously.

## 2. Design principles (what makes an SOP world-class)

1. **Standard first, binding second.** Every SOP states the universal best practice (true for any well-run AI company), then binds it to this company's concrete mechanics (file paths, commands, record formats). When the tooling changes, only the binding changes.
2. **Executable, not aspirational.** Procedures are numbered steps with explicit inputs, outputs, and stop conditions. "Communicate clearly" is a poster; "post the APR id, exact action, assigned seat, and SLA due-time on the issue" is a procedure.
3. **Every procedure has a stop condition.** An SOP that never says "stop and get a human" is incomplete. Gates are part of the procedure, not an exception to it.
4. **Single source of truth, referenced not duplicated.** Gate routing lives in `company/org/routing.md`; SOPs point at it. Duplicated facts rot.
5. **Anti-patterns are explicit.** Each SOP names the failure modes it exists to prevent. Agents pattern-match; give them the negative pattern too.
6. **Short enough to load, complete enough to act.** A role SOP should fit comfortably in an agent's context alongside its task. Cut narrative; keep decision rules.

## 2a. The five mandatory parts

Every operational SOP (all role SOPs, and foundation SOPs that define a process) must contain these parts, explicitly:

1. **Purpose & Scope** — exactly what system, process, or role the procedure applies to, and what is out of scope.
2. **Roles & Responsibilities (RACI)** — who builds, who tests, who signs off; Accountable is a human seat for anything gated.
3. **Step-by-Step Instructions** — chronological, actionable, numbered; each procedure ends at a handoff or a gate.
4. **Exceptions & Red Flags** — pre-defined rules for anomalies (especially AI anomalies: hallucination, drift, off-policy output — see SOP-013 §4) and the explicit exception paths with who authorizes them.
5. **KPIs & Metrics** — concrete, computable measures of process success (SOP-008: computed, never guessed).

Role SOPs follow the section layout in `roles/_template.md`, which realizes these five parts. Policy-style foundations (e.g. this document) carry at minimum Purpose & Scope plus explicit red flags/anti-patterns.

## 3. The SOP library layout

```
docs/sop/
  README.md                 # index + loading protocol for agents
  foundations/              # SOP-0xx — global procedures, apply to every employee
  roles/                    # SOP-Rxx — one per role (23 AI employees + human seats)
    _template.md            # the mandatory role-SOP template
```

Foundations override role SOPs on conflict; `CLAUDE.md` and ADRs override everything. Precedence: **ADRs > CLAUDE.md > foundations > role SOP > skill/command docs**.

## 4. Document standard

Every SOP carries the header block above (applies-to, owner, status, version+date). Statuses: `Draft → Active → Superseded`. SOPs are **superseded, never silently rewritten** for material changes: bump the version, note the change in a `Changelog` footer line, and record consequential shifts in `memory/decisions-log.md`. Typo/link fixes may be edited in place without a version bump.

## 5. Change control

- **Propose:** any employee or human may draft a change (PR touching `docs/sop/`).
- **Approve:** changes to foundations or to gate/escalation behavior are gated — they route like a `merge-deploy` action and additionally need the Founder/CEO's stamp, because SOPs define what runs unsupervised. Role-SOP changes need the owning department's Approver.
- **Never** weaken a gate, an SLA, or the ADR-0004 invariant (escalation reassigns, never approves) via an SOP edit; those changes require a superseding ADR first.

## 6. Compliance

An employee that cannot follow its SOP (missing input, contradictory instruction, tooling broken) does not improvise around it — it escalates per SOP-004 with the specific step that failed. Deviations discovered after the fact are logged in `memory/decisions-log.md` and either fixed in behavior or fixed in the SOP.

---
*Changelog: 1.0 — initial standard.*
