# Plan 001 — Evalyn Control Panel & Distributed Human Approval Model

- **Status:** Draft — for review by Saran
- **Author:** AI (product-manager lens), 2026-07-12
- **Decision needed:** approve the approval model (Part A) and the MVP scope (Part D, Phase 1–2)

---

## 1. Why this plan exists

Evalyn today is designed as a **one-human company**: 23 AI employees do the work and a single founder-operator (Saran) holds every approval gate (`CLAUDE.md` §0, §5). That was the bootstrap design. It does not scale and it is changing:

1. **Evalyn is no longer a one-human-control company.** Each department gets a **human employee who approves that department's AI work**.
2. **Availability must never block the company.** If the assigned human is not available, a **higher official or a department-assigned delegate** must approve AI deliveries and answer AI employees' questions instead. Work must never silently rot in a queue.
3. **Everyone needs visibility.** The CEO and the humans across all departments need a **Control Panel** — one place to see all work in the company: what every AI employee is doing, what is waiting for approval, what is blocked on a human answer, and what shipped.

We don't yet know exactly how to build this. This plan proposes a model, an architecture with options, and a phased roadmap so we can start small and learn.

## 2. Goals

- **G1 — Distributed approvals:** every human-in-the-loop gate in `CLAUDE.md` §5 is owned by a named human per department, not by one person for the whole company.
- **G2 — Never blocked on one person:** a delegation + escalation chain guarantees every approval request and every AI question reaches *someone* authorized, within a defined SLA.
- **G3 — Company-wide visibility:** a Control Panel where CEO + department humans see all work: live activity, approval queues, blocked items, delivered artifacts, and the audit trail of who approved what.
- **G4 — Auditability:** every approval/rejection/answer is recorded in the Company OS with who, when, what, and why.
- **G5 — Keep the safety spine intact:** the gates themselves (§5) do not weaken. We are changing *who* approves, never *whether* approval is needed.

## 3. Non-goals (for now)

- Replacing the Company OS (`company/` records) — the Control Panel is a **window onto it**, not a new system of record.
- Autonomous approval by AI (an AI employee approving another AI employee's gated work) — explicitly forbidden; gates stay human.
- Payroll/HR management of the human employees themselves — out of scope; this is about approval routing and visibility only.
- Mobile apps — responsive web is enough for MVP.

---

## Part A — The distributed human approval model

### A1. Roles

| Role | Who | Authority |
|---|---|---|
| **Department Approver** | One named human per department | Approves that department's gated AI work; answers its AI employees' questions |
| **Deputy Approver** | A second named human per department (can be shared across small departments) | Same authority when the Approver is unavailable or delegates |
| **Department Head** | The human accountable for the department | Can approve anything in the department; assigns/reassigns Approver & Deputy |
| **CEO / Founder-Operator** | Saran (initially) | Company-wide override; final escalation point; owns cross-department gates (e.g., company-wide pricing policy, legal) |

Departments follow the existing roster grouping (`CLAUDE.md` §2): **Leadership, People/Finance, Product/Design, Engineering, Sales/Delivery, Marketing/Support, Operations** — 7 departments to staff. One human may hold roles in more than one department while the human team is small (day one, Saran holds all of them — the current model is just the degenerate case of this one).

### A2. Gate → department mapping

Each gate type from `CLAUDE.md` §5 routes to a department's approver by default:

| Gate | Default approving department |
|---|---|
| Merge / deploy / migrations | Engineering |
| External comms (customer email, publish, post) | Marketing/Support — or Sales/Delivery when customer-specific |
| Money (funds, spend, invoices, discounts) | People/Finance |
| Commitments (price, date, SLA, roadmap) | Sales/Delivery (price/date/SLA) · Product/Design (roadmap) |
| People (offers, terminations, ratings, comp) | People/Finance — CEO co-approval required |
| Procurement (orders, vendor signing) | Operations |
| Revenue booking (milestone acceptance, PO booking) | People/Finance |

High-risk gates can require **two approvals** (e.g., People decisions = HR approver + CEO). The mapping lives in a config record, not in code, so it can change without re-engineering.

### A3. Availability, delegation, escalation (the core mechanism)

Every approval request and AI question carries an **SLA clock** by priority:

| Priority | Example | First response SLA | Escalation step |
|---|---|---|---|
| P0 — urgent | prod deploy fix, customer-visible incident reply | 2h | every 1h |
| P1 — normal | proposal send, invoice send, PR merge | 1 business day | every business day |
| P2 — low | content calendar approval, internal doc | 3 business days | after 3 days |

**Routing algorithm (proposed):**

```
1. Request created → assigned to the Department Approver for the gate's department.
2. Approver marked unavailable (OOO/status) OR SLA expires unanswered
     → auto-reassign to Deputy Approver, notify both.
3. Deputy also unavailable / SLA expires
     → escalate to Department Head.
4. Department Head silent past SLA
     → escalate to CEO. CEO queue is the terminal, always-staffed backstop.
At every hop: the AI employee that raised the request is notified of who now owns it.
```

Manual moves are always allowed: any approver can **delegate** a specific item to another authorized human ("assign to someone" — the user's requirement), and the Department Head can re-point the default Approver/Deputy at any time. Every hop is logged.

**Availability signal:** each human has a status (`available / busy / ooo until <date>`) settable in the Control Panel (later: synced from calendar/Slack). Unavailable ⇒ routing skips them immediately instead of waiting for SLA expiry.

### A4. AI questions (not just approvals)

AI employees also get **blocked on questions** ("which of these two scope options?", "is this claim accurate?"). These flow through the same routing engine as approvals but resolve with an **answer** instead of approve/reject. Same SLA, same delegation, same escalation, same audit trail. One queue, two item types: `approval` and `question`.

### A5. Decision outcomes

Every routed item ends in exactly one of: **approved** (with optional conditions) · **rejected** (reason required — goes back to the AI employee as rework input) · **answered** (for questions) · **withdrawn** (AI employee cancels, e.g., superseded). Nothing expires silently — expiry escalates, it never auto-approves. **Silence never equals consent.**

---

## Part B — The Control Panel (product)

### B1. Users and what each needs

| User | Primary need |
|---|---|
| **CEO** | Whole-company picture: every department's activity, bottlenecks, aging approvals, escalations that reached them |
| **Department Approver / Deputy** | *Their inbox*: what needs my approval/answer now, with full context to decide in one sitting |
| **Department Head** | Department health: queue age, AI output volume, who's approving what, reassignment controls |
| **Any human employee** | Read visibility into all company work (per user: "users want to see all the works in company") |

### B2. Core screens (MVP set)

1. **Company Dashboard (CEO view)** — live tiles per department: work in progress, items waiting on humans (count + oldest age), escalations, recent deliveries. The pulse of the whole company on one screen.
2. **Approval Inbox** — the heart of the product. Per-human queue of approvals + questions, sorted by SLA urgency. Each item shows: the artifact (diff/proposal/invoice/draft), the AI employee's summary and recommendation, linked Company OS records, the exact gated action ("send this email to X"), and one-click **Approve / Reject (reason) / Delegate / Ask the AI a follow-up**.
3. **Department Board** — per-department feed of all AI work: in progress, waiting, delivered; filterable by AI employee, record type, stage.
4. **Work Item / Record Detail** — one approval or Company OS record with full history: who did what, approval stamps, question threads, related records.
5. **People & Routing Admin** — the human registry: departments, Approver/Deputy/Head assignments, availability status, gate→department mapping, SLA config.
6. **Audit Log** — filterable ledger of every gated decision (G4).

### B3. Notifications

Approvers must not need to keep a tab open. Notify on assignment, SLA warning (50 % elapsed), and escalation — via **email first (MVP)**, Slack next (deep links back to the inbox item), then optional daily digest for Heads/CEO.

---

## Part C — Architecture (how we might achieve it)

### C1. The key insight

The Company OS already defines the state (`company/` records with owner, stage, approval stamps — `guides/company-os.md`). The Control Panel should be a **UI + routing engine over that state**, not a second brain. The design question is where the live state lives. Three options:

**Option 1 — Git-native MVP (recommended to start).**
Approvals and questions are files: `company/approvals/<id>.md`, `company/questions/<id>.md`, humans and routing in `company/org/`. AI employees write request records and stop (exactly like today's gates); a small web app (e.g., Next.js) reads the repo via GitHub API, renders dashboard + inbox, and writes decision stamps back as commits. A scheduled job (GitHub Action / cron) runs the SLA/escalation engine and sends emails.
*Pros:* almost no new infrastructure, perfect audit trail (git history *is* the audit log), Company OS stays the single source of truth. *Cons:* minutes-level latency, no real-time push, concurrency is crude.

**Option 2 — Dedicated backend, git-synced.**
Postgres + API server + web app; repo webhooks sync records in, decisions written back to `company/` for the AI employees. Real-time queues, proper auth/roles, websockets.
*Pros:* real product UX, scales to many humans. *Cons:* real engineering + ops burden; two stores to keep consistent.

**Option 3 — Rent the workflow (interim accelerator).**
Use GitHub Issues/Projects as the queue (one issue per approval, labels = state, assignment = routing) or Slack approval messages, plus a thin read-only dashboard.
*Pros:* days not weeks, notifications for free. *Cons:* clunky for non-engineers (finance/sales humans living in GitHub Issues), weak custom SLA logic, dashboard still needed anyway.

**Recommendation:** **Option 1 now → Option 2 when it hurts.** The file schemas and routing rules we define for Option 1 carry over unchanged — Option 2 just swaps the storage/transport underneath the same model. Elements of Option 3 (Slack notifications) can bolt onto either.

### C2. New Company OS entities (needed under every option)

```
company/org/
  departments.md          # 7 departments, their AI employees, their gates
  humans/<human-id>.md    # name, contact, roles (approver/deputy/head), departments, availability
  routing.md              # gate → department map, SLA table, escalation chain config
company/approvals/<id>.md # gate type, requesting AI employee, artifact link, exact action,
                          # priority, assignee, hop history, state, decision + reason + stamp
company/questions/<id>.md # same shape; resolves with an answer instead of approve/reject
```

`registry.md` indexes both new record types. Approval stamps in existing records (proposals, invoices, milestones…) link to their `approvals/<id>` record.

### C3. AI-employee integration

- Agents/skills that hit a gate stop **creating an approval record** instead of (as today) asking in-chat — the "present the finished artifact and ask" behavior in `CLAUDE.md` §5 becomes "write the approval record, notify, and end turn."
- On decision: **approved** → the human (or a triggered session) executes/asks the AI employee to execute the exact approved action; **rejected** → reason feeds a rework loop; **answered** → the AI employee resumes with the answer.
- Later: repo triggers or scheduled sessions let AI employees pick up decisions automatically instead of waiting to be re-invoked.

### C4. Security & access notes

Auth for the web app (SSO/email magic-link), role-based screens (only authorized approvers can decide), and care with customer PII in artifacts rendered in the panel (`CLAUDE.md` §6.5). Approval writes must be attributable to a real human identity — no shared logins.

---

## Part D — Phased roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| **0. Define the org (docs only)** | Fill `company/org/` (departments, humans, routing, SLAs — humans can be "Saran ×7" on day one). Update `CLAUDE.md` §0 + §5 to the distributed model. Write the approval/question record schema. | A gate fires and the record names the correct department + approver on paper. |
| **1. File-based approval loop** | AI employees write `approvals/`/`questions/` records; humans decide by editing the record (or via a tiny CLI/skill); scheduled job checks SLAs + sends email notifications/escalations. | One real deliverable flows draft → approval record → human stamp → execution, with an escalation exercised at least once. |
| **2. Control Panel MVP (Option 1)** | Web app: Company Dashboard, Approval Inbox with approve/reject/delegate, Department Board, availability toggle. Reads repo, writes decisions as commits. | A non-technical human approves an AI delivery end-to-end without touching git or Claude Code. |
| **3. Routing automation & Slack** | Auto-reassign on unavailability, full escalation chain, delegation UI, Slack notifications with deep links, audit log screen. | Zero approvals breach final SLA in a 2-week trial; every hop visible in the audit log. |
| **4. Scale-up (Option 2 as needed)** | Dedicated backend, real-time updates, analytics (approval latency, throughput per department, AI rework rate), calendar-based availability. | Panel supports the full human team with sub-second UX. |

Suggested immediate next step: **Phase 0 is a documentation task Evalyn's own AI employees can draft this week**, with Saran approving the org design.

## Part E — Risks & open questions

| # | Risk / open question | Current thinking |
|---|---|---|
| 1 | **How many humans, and who?** 7 departments need Approvers/Deputies/Heads; hiring order unknown. | Start with Saran in all seats (model works at n=1), staff via `/hiring-plan` per department. **TBD: hiring order & budget.** |
| 2 | **Rubber-stamping** — distributed approvers may approve without reading. | Inbox shows the artifact + a decision-ready summary; track rejection rate per approver (0 % over months = smell); spot audits by Heads/CEO. |
| 3 | **Split-brain state** if panel and repo disagree (Option 2 risk). | Stay git-native (Option 1) until scale forces Option 2; then repo remains authoritative, DB is a cache. |
| 4 | **Latency of file-based MVP** frustrates urgent (P0) gates. | Acceptable for MVP; P0 volume is low early. Revisit at Phase 3/4. |
| 5 | **Who approves the approvers?** Changes to routing/org config are themselves sensitive. | Routing/org changes are a People-gate: Department Head proposes, CEO approves. |
| 6 | **Build vs. buy the panel.** | Decide at Phase 2 kickoff; evaluate off-the-shelf approval tools, but the Company OS coupling favors a thin custom app. |
| 7 | **CLAUDE.md conflict** — §0 currently says "one human holds every gate." | Phase 0 updates it; until then this plan is the stated direction and current text remains operative. |

## Part F — Success metrics

- **Time-to-decision:** median < SLA/2 per priority class; zero terminal-SLA breaches.
- **Never-blocked:** 100 % of items reach an authorized human (delegation chain never dead-ends).
- **Visibility:** CEO can answer "what is the company doing right now?" from one screen.
- **Audit:** 100 % of gated actions traceable to a named human decision.
- **Quality:** rejection/rework rate per department trends down without approval scrutiny dropping (rejection rate never pinned at 0).
