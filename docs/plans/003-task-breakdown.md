# Plan 003 — Task Breakdown & Issue Map

- **Status:** Active — the detailed task register behind [Plan 002](002-execution-plan.md); GitHub epics and issues are generated from this document.
- **Derived from:** [Spec 002 (phased implementation)](../specs/spec-002-phased-implementation.md) · PRD 001 · Tech Spec 001 · ADRs 0002–0006
- **Conventions:** one epic per phase; one issue per task; every issue carries its EX-id, owner (AI employee), human gate, acceptance criteria, doc links, and explicit `Blocked by` / `Blocks` relationships. The **Issue #** column is filled in as issues are created.

## Epics

| Epic | Phase | Exit criterion | Issue # |
|---|---|---|---|
| E0 — Foundation & Org Definition | 0 | Sample gate routes correctly on paper; sign-off recorded | TBD |
| E1 — File-Based Approval Loop | 1 | One real deliverable + one escalation drill through the loop | TBD |
| E2 — Control Panel MVP | 2 | Non-technical human approves without git, < 5 min | TBD |
| E3 — Routing Automation & First Hires | 3 | 2-week zero-breach trial; ≥1 non-founder approver live | TBD |
| E4 — Scale-Up (trigger-based) | 4 | Deferred — opens when the latency/concurrency trigger fires | TBD |

Already completed before issue tracking started (recorded in Plan 002, not re-issued): EX-001 (plan approval), EX-002 (PRD), EX-003 (tech spec), EX-004 (ADRs), EX-005 (memory system).

## Task register

Columns: task, owner = AI employee that executes; gate = the human approval that closes it; deps = blocked by.

### E0 — Foundation (Phase 0)

| ID | Task | Owner | Gate | Blocked by | Blocks | Issue # |
|---|---|---|---|---|---|---|
| EX-006 | Update CLAUDE.md §0/§5 to distributed-approver model | tech-writer | Founder approves | PR #1 review | EX-007 | TBD |
| EX-007 | Create `company/org/` (departments, humans, routing, SLAs) | hr + tech-writer | Founder approves | EX-006 | EX-008, EX-101 | TBD |
| EX-008 | Paper dry-run: all 7 gate types route correctly | tester | — | EX-007 | EX-101 | TBD |

### E1 — Approval loop (Phase 1)

| ID | Task | Owner | Gate | Blocked by | Blocks | Issue # |
|---|---|---|---|---|---|---|
| EX-101 | Record templates + registry indexing + CI schema check | developer | merge | EX-007, EX-008 | EX-102/103/105/106 | TBD |
| EX-102 | Gate-integration pass across agents/skills | developer + tech-writer | merge | EX-101 | EX-107 | TBD |
| EX-103 | SLA/escalation job (idempotent, scheduled) | developer | merge | EX-101 | EX-104, EX-108, EX-301 | TBD |
| EX-104 | Email notifications (assign / 50% SLA / escalation) | developer + devops | merge | EX-103 | EX-107, EX-108, EX-303 | TBD |
| EX-105 | `/approve` helper skill (authorized decide + stamp) | developer | merge | EX-101 | EX-107 | TBD |
| EX-106 | Exactly-once executor (claim → hash check → execute → stamp) | developer | merge + security review | EX-101 | EX-107 | TBD |
| EX-107 | Live drill: one real deliverable end to end | delivery-manager | Founder approves the item | EX-102, EX-104, EX-105, EX-106 | EX-109, EX-201 | TBD |
| EX-108 | Escalation drill: deliberately ignored request | tester | — | EX-103, EX-104 | EX-109 | TBD |
| EX-109 | Baseline metrics captured | data-analyst | — | EX-107, EX-108 | EX-305 | TBD |

### E2 — Control Panel MVP (Phase 2)

| ID | Task | Owner | Gate | Blocked by | Blocks | Issue # |
|---|---|---|---|---|---|---|
| EX-201 | Design brief: Inbox, Dashboard, Board flows (AA) | designer | Founder approves | EX-107 | EX-202 | TBD |
| EX-202 | App scaffold: auth (humans-registry), repo read layer | developer | merge (via loop) | EX-201 | EX-203/204/205 | TBD |
| EX-203 | Approval Inbox + Item Detail (decide = commit) | developer | merge (via loop) | EX-202 | EX-206 | TBD |
| EX-204 | Company Dashboard + Department Board | developer | merge (via loop) | EX-202 | EX-206 | TBD |
| EX-205 | Availability toggle + People & Routing admin | developer | merge (via loop) | EX-202 | EX-206 | TBD |
| EX-206 | Security review (adversarial authz tests, PII) | security | Founder accepts | EX-203, EX-204, EX-205 | EX-207 | TBD |
| EX-207 | Deploy behind auth (production checklist) | devops | Founder deploy gate | EX-206 | EX-208, EX-301, EX-302 | TBD |
| EX-208 | Acceptance test: non-technical approval end to end | tester + delivery-manager | Founder accepts | EX-207 | E2 close | TBD |

### E3 — Automation & staffing (Phase 3)

| ID | Task | Owner | Gate | Blocked by | Blocks | Issue # |
|---|---|---|---|---|---|---|
| EX-301 | Auto-reassign on unavailability (skip, don't wait) | developer | merge (via loop) | EX-103, EX-207 | EX-304 | TBD |
| EX-302 | Delegation UI + audit-log screen | developer | merge (via loop) | EX-207 | EX-304 | TBD |
| EX-303 | Slack notifications with deep links | developer + devops | merge (via loop) | EX-104, EX-207 | EX-304 | TBD |
| EX-304 | 2-week SLA trial: zero terminal breaches | data-analyst | — | EX-301, EX-302, EX-303 | EX-306 | TBD |
| EX-305 | `/hiring-plan` for first Department Approvers | hr | Founder hire decision | EX-109 | EX-306 | TBD |
| EX-306 | Seat-handover runbook + first non-founder approver live | hr + tech-writer | Founder | EX-304, EX-305 | E3 close | TBD |

### E4 — Scale-up (Phase 4, deferred)

No tasks issued. The epic stays open as the parking place for the trigger (Spec 002 Phase 4); first task when it fires is a new ADR proposing Option 2.

## Relationship rules used in issues

- **Blocked by** — hard dependency; the issue cannot start until the blocker closes.
- **Blocks** — the inverse, listed for navigation.
- Epic ↔ task linking uses GitHub **native sub-issues** (task = sub-issue of its epic).
- Human-gate closure: an issue whose gate is "Founder approves/accepts" is closed only after that approval is recorded (in the issue and, once Phase 1 lands, as an APR record).
