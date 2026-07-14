# Plan 002 — Execution Plan: Approval Loop & Control Panel

- **Status:** Active — executes [Plan 001](001-control-panel-and-human-approval-model.md) (approved direction by Saran, 2026-07-12)
- **Owner:** project-manager (delivery) · Saran (all gates, until seats are staffed)
- **Related:** PRD `docs/specs/prd-001-control-panel.md` · Tech spec `docs/specs/tech-spec-001-approval-loop-and-panel.md` · ADRs `docs/adrs/`
- **Working agreement:** update task states in this file as work moves; log decisions in `docs/adrs/` (architectural) or `memory/decisions-log.md` (operational); weekly `company-standup` reports against this plan.

## 1. Scope

Deliver Phases 0–3 of Plan 001: the distributed approval model on paper → the file-based approval loop proven end to end → the Control Panel MVP → routing automation and first staffing. Phase 4 (dedicated backend) and Phase 5 (authoring skills) are explicitly out of scope until their triggers fire (Plan 001 D2, G4).

## 2. Task board

States: `todo` · `in-progress` · `blocked` · `waiting-on-gate` · `in-review` · `done`. IDs are stable — reference them in commits and standups. Transitions follow the **Task lifecycle protocol** (CLAUDE.md §3b): issues get an `in-progress` label + comment before work starts, and a gate comment (record id, exact action, assignee, SLA, how to decide) the moment a task is `waiting-on-gate`.

### Phase 0 — Define & specify — ✅ DONE 2026-07-13 (PR #1 + PR #33)

| ID | Task | Owner (AI) | Gate / approver | State |
|---|---|---|---|---|
| EX-001 | Plan 001 reviewed & direction approved | — | Saran | done (2026-07-12) |
| EX-002 | Write PRD for Control Panel (`docs/specs/prd-001-control-panel.md`) | product-manager | Saran approves | done (PR #1 merged) |
| EX-003 | Write tech spec: approval loop + panel (`docs/specs/tech-spec-001-…`) | solutions-architect | Saran approves | done (PR #1 merged) |
| EX-004 | Record foundational ADRs (0001–0006) | tech-writer | Saran approves | done (PR #1 merged — ADRs 0002–0006 Accepted) |
| EX-005 | Establish `/memory` convention and seed files | tech-writer | — | done |
| EX-006 | Update `CLAUDE.md` §0/§5 to distributed-approver model | tech-writer | Saran approves | done (PR #33 merged) |
| EX-007 | Create `company/org/` (departments, humans, routing, SLAs) | hr + tech-writer | Saran approves | done (PR #33 merged) |
| EX-008 | Dry-run on paper: fire one sample gate, verify routing resolves correct department/approver | tester | — | done — 9/9 pass (#9) |

**Phase 0 definition of done:** specs + ADRs approved; `company/org/` exists; a sample gate routes correctly on paper.

### Phase 1 — Prove the loop, zero UI — ✅ DONE 2026-07-14 (PR #34 + #35 + drills)

| ID | Task | Owner (AI) | Gate / approver | State |
|---|---|---|---|---|
| EX-101 | Implement approval/question record templates + `registry.md` indexing | developer | code-reviewer → Saran merge | done (PR #34) |
| EX-102 | Gate-integration pass: update gate-hitting agents/skills to write approval records and stop | developer + tech-writer | code-reviewer → Saran merge | done (PR #34) |
| EX-103 | SLA/escalation job (scheduled): scan pending records, reassign per chain, append hops | developer | code-reviewer → Saran merge | done (PR #34) |
| EX-104 | Email notifications on assign / SLA-50 % / escalation | developer + devops | Saran merge | done (PR #34 — SMTP secrets pending for real sends) |
| EX-105 | `/approve` helper skill (decide + stamp a record from CLI in one step) | developer | Saran merge | done (PR #34) |
| EX-106 | Execution/resume mechanism per tech spec §6 (approved → executed exactly once) | developer | code-reviewer + security → Saran merge | done (PR #34) |
| EX-107 | **Live drill:** run one real deliverable end to end through the loop | delivery-manager | Saran approves the item | done — APR-20260713-001 executed exactly once; 2 bugs found+fixed (#16) |
| EX-108 | **Escalation drill:** Saran deliberately ignores one request; verify hop chain + notifications fire | tester | — | done — autonomous hop verified on main (#17) |
| EX-109 | Capture baseline metrics (time-to-decision, hops) in `memory/decisions-log.md` | data-analyst | — | done — baselines in decisions-log (#18) |

**Phase 1 definition of done:** one real artifact went draft → approval record → human stamp → executed exactly once; one escalation exercised; metrics recorded.

### Phase 2 — Control Panel MVP (Weeks 4–6) — target: 2026-08-21

| ID | Task | Owner (AI) | Gate / approver | State |
|---|---|---|---|---|
| EX-201 | Design brief: Approval Inbox + Company Dashboard + Department Board flows | designer | Saran approves | done — approved by saravanan-p, executor-merged PR #37 (#19) |
| EX-202 | App scaffold, auth (humans-registry-mapped), repo read layer | developer | code-reviewer → gate | done — approved via #20, executor-merged PR #38 |
| EX-203 | Approval Inbox screen (approve / reject-with-reason / delegate / follow-up question) | developer | code-reviewer + security + tester → gate | done — approved in-channel, PR #40 merged (#21) |
| EX-204 | Company Dashboard + Department Board screens | developer | code-reviewer + tester → gate | done — approved in-channel, PR #41 merged (#22) |
| EX-205 | Availability toggle + People & Routing admin screen | developer | code-reviewer → gate | in-review — built & verified locally; PR opens once #41 merges |
| EX-206 | Security review of the whole panel (authz per role, PII in artifacts, write attribution) | security | Saran accepts | in-review — review done (2H/4M/3L), all findings fixed; report `docs/specs/security-review-001` |
| EX-207 | Deploy (devops) — behind auth, production checklist | devops | Saran deploy gate | todo |
| EX-208 | **Acceptance test:** a non-technical human approves an AI delivery without touching git/Claude Code | tester + delivery-manager | Saran accepts | todo |

**Every EX-2xx merge is approved through the Phase-1 loop itself** (dogfooding — the product gates its own construction).

### Phase 3 — Automation & staffing (Weeks 7+) — target: rolling

| ID | Task | Owner (AI) | Gate / approver | State |
|---|---|---|---|---|
| EX-301 | Auto-reassign on unavailability status (skip, don't wait for SLA) | developer | gate | todo |
| EX-302 | Delegation UI + full hop-history/audit-log screen | developer | gate | todo |
| EX-303 | Slack notifications with deep links | developer + devops | gate | todo |
| EX-304 | 2-week SLA trial: zero terminal breaches | data-analyst | — | todo |
| EX-305 | `/hiring-plan` for first Department Approvers (order: by gate volume — measure in EX-109/304) | hr | Saran hire decision | todo |
| EX-306 | Seat handover runbook + first non-Saran approver live | hr + tech-writer | Saran | todo |

## 3. Cadence & reporting

- **Weekly:** `company-standup` workflow reports progress against this board; project-manager updates task states and flags `blocked` items with a crisp escalation (situation + options + recommendation).
- **Per phase exit:** delivery-manager verifies the definition of done and records it in `memory/decisions-log.md`; Saran signs off before the next phase starts.
- **Scope changes:** amend Plan 001 first (new draft version), then this board — never silently.

## 4. Risk triggers (act, don't watch)

| Trigger | Action |
|---|---|
| Resume loop (EX-106) can't guarantee exactly-once execution | Stop Phase 2 start; redesign per tech spec §6 alternatives; new ADR |
| File-latency pain at P0 priority during Phase 1–2 | Note it, continue; re-evaluate Option 2 timing at Phase 3 review |
| Any gate bypassed during dogfooding | Incident: halt merges, root-cause, fix the agent/skill charter before resuming |
| Saran's review time becomes the bottleneck (>1 day median on P1) | Pull EX-305 (hiring) forward |
