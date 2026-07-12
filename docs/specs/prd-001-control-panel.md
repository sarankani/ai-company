# PRD 001 — Evalyn Control Panel

- **Status:** Draft — for approval by Saran (task EX-002)
- **Owner:** product-manager
- **Sources:** Plan 001 Parts A–B · Plan 002 Phase 2 scope
- **One-liner:** One web app where Evalyn's humans see all AI work, approve gated actions, and answer AI employees' questions — so the company is never blocked on an unavailable person and never acts without a human decision.

## 1. Problem

Evalyn's 23 AI employees produce work continuously, but every irreversible action stops at a human gate. Today the gate is one person answering inside Claude Code sessions. That fails three ways: gates are invisible (no queue, no aging, no company-wide view), gates block on one person's availability, and deciding requires technical tooling that future department approvers (finance, sales humans) won't use.

## 2. Users

| Persona | Job to be done | Primary screen |
|---|---|---|
| **Approver / Deputy** | "Show me what needs *my* decision now, with enough context to decide in one sitting." | Approval Inbox |
| **Department Head** | "Is my department healthy? Who's deciding what? Reassign when needed." | Department Board |
| **CEO** | "What is the whole company doing right now, and where is it stuck?" | Company Dashboard |
| **Any employee (human)** | "Let me see any work item's status and history." | Record Detail (read-only) |

## 3. User stories & acceptance criteria (MVP)

### 3.1 Approval Inbox — the heart of the product

- **US-1** As an approver, I see my pending items sorted by SLA urgency, worst first.
  - AC: list shows type (approval/question), gate, requesting AI employee, priority, time-to-SLA (live), artifact title. Overdue items are visually unmissable.
- **US-2** As an approver, I can decide from a single item view without leaving the page.
  - AC: item view renders the artifact (or diff/preview), the AI's summary + recommendation, the **exact gated action verbatim** ("send this email to jane@acme.com"), and links to related Company OS records.
  - AC: actions available: **Approve** (optional conditions note) · **Reject** (reason mandatory) · **Delegate** (pick any authorized human; reason optional) · **Ask follow-up** (sends a question back to the requesting AI employee; item stays pending).
  - AC: a decision writes the stamp (who/when/what/why) to the record and disappears from my queue within 60 s.
- **US-3** As an approver, I can answer AI questions in the same inbox.
  - AC: question items resolve with a free-text answer; answer is delivered to the requesting AI employee's record.
- **US-4** As an approver, decisions are attributable to me alone.
  - AC: no shared logins; every stamp carries my identity from the humans registry; I can only decide items where the routing rules authorize me.

### 3.2 Company Dashboard (CEO)

- **US-5** As the CEO, I see one tile per department: items in progress, waiting-on-human count + oldest age, escalations in flight, deliveries this week.
  - AC: any tile drills into that Department Board. Data no staler than 5 minutes.
- **US-6** As the CEO, I see every item that escalated to me, flagged separately.

### 3.3 Department Board

- **US-7** As a Department Head, I see all my department's AI work — in progress / waiting / delivered — filterable by AI employee, record type, and state.
- **US-8** As a Department Head, I can reassign any pending item and change my department's Approver/Deputy assignment.
  - AC: reassignments append to the item's hop history; assignment changes are themselves logged.

### 3.4 Availability & routing

- **US-9** As a human, I can set my status (`available / busy / ooo until <date>`) in one click; routing skips me immediately while unavailable.
- **US-10** As an approver, I'm notified by email on assignment, at 50 % SLA elapsed, and on escalation, with a deep link to the item. *(Slack: Phase 3.)*

### 3.5 Record Detail & audit

- **US-11** As any human, I can open any work item and see its full history: hops, decisions, question threads, related records.
- **US-12** As the CEO/Head, I can filter a ledger of every gated decision by department, human, gate, and date. *(Full audit screen: Phase 3; MVP = per-record history.)*

## 4. Non-functional requirements

| Area | Requirement |
|---|---|
| Auth | SSO or email magic-link; identity must map 1:1 to `company/org/humans/`; no shared accounts |
| Authorization | Role-based per routing rules: deciding restricted to authorized humans; viewing open to all registered humans |
| Audit | Every state change attributable (who/when/what/why) and immutable (append-only history) |
| Latency | Inbox reflects new items ≤ 5 min (git-native MVP); decisions persist ≤ 60 s |
| PII | Artifacts may contain customer data — no public URLs, no caching in third-party services beyond the host, access logged |
| Responsive | Usable on a phone for approve/reject; desktop for dashboards |
| Fail-safe | If the panel is down, the file-based loop (Phase 1) still works — the panel is a window, never the only path |

## 5. Explicitly out of scope (MVP)

Editing Company OS records in the panel (beyond decisions/status) · analytics dashboards · Slack (Phase 3) · calendar-synced availability (Phase 4) · mobile apps · AI-side chat UI (AI employees are driven via Claude Code, not the panel).

## 6. Success metrics

Adopted from Plan 001 Part F: median time-to-decision < SLA/2 · zero terminal-SLA breaches · zero dead-ended items · 100 % decision attribution · CEO answers "what's the company doing?" from one screen. Plus one product metric: **an approver handles an item in < 5 minutes median** (context is decision-ready).

## 7. Open questions

1. Hosting/auth provider choice — tech spec proposes; Saran approves (procurement gate if paid).
2. Artifact rendering depth in MVP (markdown always; code diffs — nice-to-have; binary docs — link out?).
3. Read access for *all* humans vs. per-department confidentiality (People/Finance items may need restriction) — **recommend: restrict People-gate items to People/Finance + CEO from day one.**
