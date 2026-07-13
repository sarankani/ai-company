# Spec 002 — Phased Implementation: Approval Loop & Control Panel (all phases, one document)

- **Status:** Draft — for approval by the Founder-Operator
- **Owner:** solutions-architect + product-manager
- **Parents:** [Plan 001](../plans/001-control-panel-and-human-approval-model.md) (model) · [Plan 002](../plans/002-execution-plan.md) (board) · [PRD 001](prd-001-control-panel.md) (product) · [Tech Spec 001](tech-spec-001-approval-loop-and-panel.md) (design) · ADRs 0002–0006
- **What this document is:** the single implementation specification across **all phases (0–4)** — per phase: objective, scope, detailed requirements, deliverables, and acceptance criteria. Epics and GitHub issues are generated from this spec via [Plan 003 (task breakdown)](../plans/003-task-breakdown.md).

---

## Phase 0 — Foundation & Org Definition (Week 1)

**Objective:** the distributed approval model exists on paper and in config — before any code.

**Scope:** documentation and configuration only. No executable code.

### Requirements

- **P0-R1 — CLAUDE.md reflects the real model.** §0 and §5 change from "one human holds every gate" to the distributed model: 3 seats per department (Approver / Deputy / Head), CEO terminal backstop, SLA-escalation rules, all seats initially held by the Founder-Operator. The gates table itself is unchanged (gates never weaken — ADR-0004).
- **P0-R2 — `company/org/` exists and is complete.** `departments.md` (7 departments, their employees, their gates), `humans/<id>.md` (schema per Tech Spec 001 §2.2), `routing.md` (gate→department map, SLA table P0/P1/P2, escalation chain, dual-approval gates). Routing config changes are themselves gated (Plan 001 risk #5).
- **P0-R3 — Paper dry-run passes.** A sample gate of each of the 7 types resolves on paper to the correct department, approver, SLA, and escalation chain, using only the files from P0-R2.

**Deliverables:** updated `CLAUDE.md` · `company/org/` tree · dry-run record appended to `memory/decisions-log.md`.

**Exit criteria:** all three requirements verified; Founder-Operator sign-off recorded.

---

## Phase 1 — File-Based Approval Loop, Zero UI (Weeks 2–3)

**Objective:** prove the entire approval loop with plain files before any UI exists. If the loop works with files, everything after is presentation.

**Scope:** record templates, gate integration, SLA job, email notifications, decision helper, executor. Explicitly **no** web UI.

### Requirements

- **P1-R1 — Record schema implemented.** `company/approvals/APR-*.md` and `company/questions/QST-*.md` exactly per Tech Spec 001 §2.4: YAML frontmatter (id, type, gate, department, priority, state, requested_by, artifact, exact `action`, links, timestamps, assignee, append-only `hops` and `notified`, `decision`, `execution`), body sections (Summary / Decision / Thread). `registry.md` indexes open items. A CI check validates schema on every commit.
- **P1-R2 — Gate integration.** Every gate-hitting agent/skill changes its terminal behavior: finish artifact → write approval record with the exact action → update registry → stop. In-chat approval by an authorized human remains valid but the record is always written (channel flexible, record mandatory).
- **P1-R3 — SLA/escalation job.** Scheduled (~15 min): scan `state: pending` → skip unavailable humans → escalate SLA breaches one hop along approver→deputy→head→CEO → append hops → idempotent via the `notified`/`hops` logs. No transition out of `pending` except a named human's decision (ADR-0004). Alert if no successful run in 2 h.
- **P1-R4 — Email notifications.** On assignment, 50 % SLA elapsed, and escalation — with a link to the record. Notified events logged on the record; re-runs never double-send.
- **P1-R5 — `/approve` helper skill.** One command for a human to decide a record: validates authorization against `routing.md`, writes the full stamp (who/when/outcome/why), flips state. Reject requires a reason.
- **P1-R6 — Exactly-once executor.** Per Tech Spec 001 §6: claim (`execution.claimed_at`) → verify artifact hash unchanged since approval → perform the exact `action` verbatim → stamp `executed_at`. Stale claims flag a human, never silently retry. Deviation (artifact changed, action differs) ⇒ withdraw + new linked record.
- **P1-R7 — Live drill.** One real deliverable flows end to end: draft → record → notification → human stamp → executed exactly once.
- **P1-R8 — Escalation drill.** One request deliberately ignored: verify hop chain fires, both humans notified, item never auto-resolves.
- **P1-R9 — Baseline metrics.** Time-to-decision, hop count, and gate volume per department captured to `memory/`.

**Exit criteria:** P1-R7 and P1-R8 pass with evidence; zero schema violations in CI; metrics recorded.

---

## Phase 2 — Control Panel MVP (Weeks 4–6)

**Objective:** a non-technical human approves an AI delivery end to end without touching git or Claude Code.

**Scope:** the six MVP screens over the Phase-1 records (PRD 001 §3), git-native (no database — ADR-0002). **Dogfooding rule:** every Phase-2 merge is approved through the Phase-1 loop.

### Requirements

- **P2-R1 — Design brief first.** Inbox, Item Detail, Company Dashboard, Department Board flows; all UI states; accessibility AA (PRD user stories US-1…US-12 as the contract).
- **P2-R2 — App scaffold + auth.** Next.js server-rendered; email magic-link; session must match `company/org/humans/`; no shared logins; authorization evaluated server-side per `routing.md` on every decision write.
- **P2-R3 — Read layer.** GitHub API → server cache TTL ≤ 5 min, revalidated after own writes. Inbox sorted by SLA urgency, worst first, live time-to-SLA.
- **P2-R4 — Approval Inbox + Item Detail.** Artifact rendered (markdown inline, else link out), AI summary + recommendation, exact action verbatim, one-click Approve (optional conditions) / Reject (reason mandatory) / Delegate (authorized humans only) / Ask-follow-up. Decision = one commit with stamp + `Decided-by` trailer; optimistic concurrency on conflict.
- **P2-R5 — Company Dashboard + Department Board.** Per-department tiles (WIP, waiting count + oldest age, escalations, deliveries); board filterable by employee, record type, state; data staleness ≤ 5 min.
- **P2-R6 — Availability + admin.** One-click `available / busy / ooo until`; People & Routing admin (seat assignments; changes logged and gated).
- **P2-R7 — Security review.** Authz per role adversarially tested (decide without authorization, replay a commit, execute unapproved, mutate post-approval — all must fail); People-gate items visible only to People/Finance seats + CEO; no PII in URLs/logs.
- **P2-R8 — Deploy.** Behind auth, production checklist, human deploy gate.

**Exit criteria:** PRD acceptance test — a non-technical human approves an AI delivery start-to-finish in < 5 minutes without git; security review accepted; panel down ⇒ file loop still works.

---

## Phase 3 — Routing Automation, Slack & First Hires (Weeks 7+)

**Objective:** the loop runs itself, and the first real humans take seats.

### Requirements

- **P3-R1 — Auto-reassignment.** Availability flips reassign that human's pending items immediately (hop: unavailable) — no waiting for SLA expiry.
- **P3-R2 — Delegation UI + audit screen.** Full hop-history per item; filterable company-wide decision ledger (who/what/when/why, by department, human, gate, date).
- **P3-R3 — Slack notifications.** Deep links to inbox items; same idempotency log as email.
- **P3-R4 — SLA trial.** 2-week measured trial: zero terminal-SLA breaches; every hop visible in the audit log.
- **P3-R5 — Hiring.** `/hiring-plan` for the first Department Approvers, ordered by measured gate volume (P1-R9 / P3-R4 data); seat-handover runbook; ≥ 1 non-founder approver live. Hire decisions are human-gated (ADR-0003 mechanics unchanged as seats transfer).

**Exit criteria:** trial passes; first real approver operating a department's queue end to end.

---

## Phase 4 — Scale-Up (trigger-based, not scheduled)

**Objective:** move to a dedicated backend **only when git-native latency or concurrency measurably hurts** (defined trigger: sustained P0 gate volume where the ≤ 5 min read latency breaches SLA response needs, or persistent write conflicts).

**Scope when triggered:** Postgres + API + websockets per Plan 001 Option 2; repo stays authoritative, DB is a cache; analytics (approval latency, throughput per department, AI rework rate); calendar-synced availability. Requires a new ADR before build.

**Explicitly deferred with it:** authoring skills (`/create-agent` etc.) per ADR-0006 — Phase 5, double-gated.

---

## Cross-phase invariants (apply to every task)

1. Silence never equals consent — no auto-approve/reject/send, ever (ADR-0004).
2. Git is the single source of truth; every client is stateless against it (ADR-0002).
3. Every gated action traceable to a named human stamp (Plan 001 G4).
4. The panel is a window — the file loop must keep working without it.
5. Every Phase ≥ 2 merge goes through the Phase-1 loop (dogfooding).
