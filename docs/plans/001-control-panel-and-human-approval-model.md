# Plan 001 — Evalyn Control Panel & Distributed Human Approval Model

- **Status:** Draft v2 — for review by Saran
- **Author:** AI (product-manager lens), 2026-07-12 · v2 same day: execution approach folded in, meta-tooling assessment added (Part G)
- **Decision needed:** approve the approval model (Part A) and the execution plan (Part D, Weeks 1–3 to start)
- **Feasibility verdict:** Doable with no invention required — approval routing with SLA escalation is proven workflow-engine territory, and the Control Panel is a UI over records the Company OS already defines. The two places the real work lives: the **resume loop** (AI stops at a gate → human approves later in a panel → AI picks the work back up exactly once) and making the panel usable by **non-technical humans**. The residual risk that stays human forever: approval *quality* — the system guarantees someone decides in time, not that they decide well.

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

## Part D — Execution plan: use the company to build the company

This project is **Evalyn's own first internal project**, run through Evalyn's own value chain with Saran as the customer. Every step below is owned by a named AI employee and stops at the normal gates. That both delivers the panel and stress-tests the operating model on a real project — if the chain can't build its own control panel, we learn it here, cheaply.

### D1. Execution principles (hold these throughout)

1. **Prove the loop before the UI.** The file-based approval loop (Week 2–3) must work end to end before a single screen is designed. If the loop works with plain files, everything after is presentation; if it doesn't, no panel will save it.
2. **Git stays the single source of truth** until scale genuinely hurts — only then does Option 2 get built, and the repo remains authoritative.
3. **SLA expiry escalates, never auto-approves.** Silence is never consent, at any phase.
4. **Instrument from day one** — time-to-decision, escalation count, rejection rate — so we *know* the model works rather than hope.
5. **Migrate humans seat-by-seat, never big-bang.** Saran starts in all seats (the model must work at n=1); each hire takes one department's seats off his plate.

### D2. Week-by-week roadmap (phases mapped to owners and gates)

| Phase / weeks | What happens | AI owner(s) | Human (Saran) does | Exit criteria |
|---|---|---|---|---|
| **0 — Week 1: Decide, don't build** | Saran approves/amends this plan. `product-manager` turns Part B into a spec with acceptance criteria; `solutions-architect` pins Part C down (exact record schemas, the resume-loop trigger mechanism); `tech-writer` updates `CLAUDE.md` §0/§5 and creates `company/org/` (departments, routing, SLAs — Saran in every seat). | product-manager, solutions-architect, tech-writer | Review + approve only (~2–3 h total) | A gate fires and the record names the correct department + approver on paper. Spec and tech design approved. |
| **1 — Weeks 2–3: Prove the loop, zero UI** | `developer` implements the file-based flow: agent hits a gate → writes `approvals/<id>.md` → stops; scheduled job watches SLAs → emails; Saran approves via a one-line edit (or tiny skill); AI resumes and executes the exact approved action. Then run **one real deliverable through it end to end**, deliberately ignoring one request to watch escalation fire. | developer, tester, devops (scheduler) | Approve one real item; ignore one on purpose (escalation drill) | Draft → approval record → human stamp → execution, exactly once, with one escalation exercised. Metrics captured. |
| **2 — Weeks 4–6: Control Panel MVP (Option 1)** | A normal software project through the chain: `designer` (inbox + dashboard flows) → `developer` (web app reading the repo, decisions as commits) → `code-reviewer` + `security` + `tester` (gates) → `devops` (deploy). Every merge stops at **the new approval system itself** — the product gates its own construction. | designer, developer, code-reviewer, security, tester, devops | Approve merges/deploy via the Phase-1 loop | A non-technical human approves an AI delivery end-to-end without touching git or Claude Code. |
| **3 — Weeks 7+: Automation & staffing (parallel tracks)** | *Track A:* auto-reassign on unavailability, full escalation chain, delegation UI, Slack notifications with deep links, audit log screen. *Track B:* `hr` runs `/hiring-plan` for the first real Department Approvers — hire in order of gate volume (likely Engineering and Finance first); each hire takes over one department's seats. | developer, devops (A); hr (B) | Interview + hire decisions; hand over seats one department at a time | Zero terminal-SLA breaches in a 2-week trial; ≥1 department approver who isn't Saran. |
| **4 — Scale-up (when it hurts, not before)** | Option 2: dedicated backend, real-time updates, analytics (approval latency, throughput per department, AI rework rate), calendar-based availability sync. | eng pod | Approve the build once Option 1 latency/concurrency measurably hurts | Panel supports the full human team with sub-second UX. |

**The clock starts with one human decision: approve or amend this plan (Week 1, day 1).**

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

## Part G — Do we need dynamic agent / skill / workflow creators?

**For this project: no. For Evalyn's growth: yes, as gated authoring skills — not as runtime "dynamic" creation.** The distinction matters:

### G1. Why this project doesn't need them

- The Control Panel is a normal software project. The existing roster (designer, developer, code-reviewer, security, tester, devops, product-manager, solutions-architect) covers every step of Part D. No new persona is required to *build* it.
- What Phase 0–1 does require is **modifying existing agents and skills** — every gate-hitting agent/skill changes from "present the artifact and ask in-chat" to "write the approval record and stop." That is editing markdown files in `.claude/`, which any agent (or the `tech-writer`/`developer` employees) can already do. No creator tooling needed; Claude Code's agent/skill format *is* plain files.
- Building creator tooling first would violate execution principle D1.1 — it's UI before the loop, one level up.

### G2. Why Evalyn will want them later (and in what form)

As the company takes on real clients, three recurring needs appear:

| Need | Example | Right tool |
|---|---|---|
| New role | A client engagement needs a `mobile-developer` or `ml-engineer` persona | `/create-agent` authoring skill |
| New repeatable capability | A dozen projects all need `/api-audit` | `/create-skill` authoring skill |
| New multi-step process | A client's bespoke delivery process (their UAT → their invoicing) | `/create-workflow` authoring skill |

The recommended form is **authoring skills**: a skill that interviews for the charter (lane, skills, gates, escalation rules), generates the `.claude/agents|commands|workflows/` file *consistent with `CLAUDE.md` §5–6* (gates and operating principles baked in by construction), and stops at a gate. Not a runtime system that spawns novel agents on the fly — Evalyn's employees are its org chart, and the org chart changing should be deliberate and reviewed, not emergent.

### G3. The one non-negotiable: changing the machinery is itself a gate

An AI writing a new AI employee is the company **modifying its own operating machinery** — the highest-leverage and highest-risk write in the whole system (a badly written agent could omit its gates). So:

- New/modified agents, skills, and workflows are a **People-gate + Engineering-gate**: the relevant Department Head approves the charter, Engineering approves the merge (same rule as risk #5 for routing config).
- Every generated persona must pass a checklist: gates present, lane defined, escalation rules present, operating principles referenced.

### G4. Scheduling

Add as **Phase 5 (post-panel)**, pulled forward only if a real client engagement demands a new persona before then — in which case write that one agent by hand through the normal gates, and let the manual experience inform the creator skill's design.
