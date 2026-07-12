# Tech Spec 001 — Approval Loop & Control Panel (git-native)

- **Status:** Draft — for approval by Saran (task EX-003)
- **Owner:** solutions-architect
- **Sources:** Plan 001 Part C · PRD 001 · ADR-0002 (git-native), ADR-0004 (never auto-approve), ADR-0005 (records as files)
- **Covers:** Phase 1 (file-based approval loop) and Phase 2 (Control Panel MVP). Phase 4 (backend) intentionally unspecified.

## 1. Architecture overview

```
AI employee hits a gate
   └─ writes company/approvals/<id>.md (or questions/<id>.md), updates registry, STOPS
        │
        ├─ SLA/escalation job (scheduled, e.g. GitHub Action cron ~15 min)
        │    reads pending records → availability + SLA checks → reassign/escalate (commit)
        │    → email notifications with deep links
        │
        ├─ Control Panel (web app, Phase 2)
        │    reads repo via GitHub API → renders dashboard/inbox
        │    human decision → commit: decision stamp on the record
        │
        └─ Executor (on decision)
             approved record + not yet executed → execute the EXACT action → stamp executed
```

Git is the single source of truth and the audit log (ADR-0002). The panel and the job are both stateless clients of the repo.

## 2. Data model — new Company OS records

All records: markdown with YAML frontmatter (machine-readable header, human-readable body). IDs are immutable; filenames = `<id>.md`.

### 2.1 `company/org/departments.md`

Seven departments; each lists its AI employees and the gates it owns (from Plan 001 A2).

### 2.2 `company/org/humans/<human-id>.md`

```yaml
id: saran
name: Saran
email: saranpkani@gmail.com
roles:                    # per-department seat assignments
  - {department: engineering, seat: approver}
  - {department: engineering, seat: head}
  # …one entry per seat held
availability: available    # available | busy | ooo
ooo_until: null            # ISO date when availability = ooo
```

### 2.3 `company/org/routing.md`

Single config file: gate → department map, priority → SLA table (P0 2h/esc 1h · P1 1bd/esc 1bd · P2 3bd), escalation chain (`approver → deputy → head → ceo`), and dual-approval gates (People = HR approver + CEO). Changing this file is itself a gated action (Plan 001 risk #5).

### 2.4 `company/approvals/<id>.md` — the core record

```yaml
id: APR-20260712-001        # APR-<yyyymmdd>-<seq>; questions use QST-
type: approval               # approval | question
gate: external-comms         # merge-deploy | external-comms | money | commitments | people | procurement | revenue-booking
department: sales-delivery   # resolved from routing.md at creation
priority: P1
state: pending               # pending | approved | rejected | answered | withdrawn
requested_by: sales          # AI employee id
artifact: company/proposals/opp-0042.md
action: "Send proposal v3 (company/proposals/opp-0042.md) to jane@acme.com"   # EXACT, verbatim
links: [company/opportunities/opp-0042.md]
created: 2026-07-12T09:00:00Z
sla_due: 2026-07-13T09:00:00Z
assignee: saran
hops: []                     # append-only: {at, from, to, reason: sla-breach|unavailable|manual-delegate|escalation}
notified: []                 # append-only: {at, to, kind: assigned|sla-warning|escalated}  → idempotent notifications
decision: null               # {by, at, outcome, reason, conditions}
execution: null              # see §6: {claimed_at, executed_at, by, result}
```

Body sections: `## Summary` (AI's decision-ready summary + recommendation) · `## Decision` (human-readable mirror of the stamp) · `## Thread` (follow-up Q&A between approver and AI employee).

**State machine:** `pending → approved | rejected | withdrawn` (approvals) · `pending → answered | withdrawn` (questions). Hops and notifications never change state. There is **no expired state** — SLA breach appends a hop, never a terminal state (ADR-0004).

### 2.5 Registry

`company/registry.md` gains an `Approvals & Questions` section: one line per open item (id, state, assignee, sla_due). Closed items drop off the registry but keep their files (git history preserves everything).

## 3. Routing algorithm

```
on create:            department = routing[gate]; assignee = first AVAILABLE of chain(department)
on availability off:  reassign that human's pending items immediately (hop: unavailable)
on SLA breach:        assignee = next in chain after current; hop: sla-breach; notify both
chain exhausted:      assignee = ceo (terminal backstop — never unassigned)
manual delegate:      any authorized human → any authorized human; hop: manual-delegate
```

Authorized = holds a seat in the item's department per `humans/`, or CEO. Dual-approval gates require two distinct decision stamps before state becomes `approved`.

## 4. SLA / escalation job

- **Runtime:** scheduled GitHub Action (cron `*/15 * * * *`), or equivalent scheduled Claude session; must be safe to run concurrently/late.
- **Logic per run:** list `state: pending` → apply §3 → send emails for any (assignment, 50 % SLA warning, escalation) **not already in `notified`** → single commit with all changes.
- **Idempotency:** `notified` and `hops` are append-only with timestamps; re-runs are no-ops. Email via SMTP/API secret in Actions secrets (provider choice = procurement gate; default SMTP via existing account).
- **Failure mode:** job down ⇒ no escalations fire, but nothing is lost — next run catches up from record state. Alert if no successful run in 2 h.

## 5. Gate integration (agents & skills)

Each gate-hitting agent/skill changes its terminal behavior from "present and ask in-chat" to:

1. Finish the artifact and write it to the Company OS as today.
2. Create the approval record (§2.4) with the **exact action** — never a vague "send the proposal."
3. Update the registry, `STOP`. Do not execute, do not wait in-session.

In-chat approval remains valid when the authorized human is present in the session ("approve APR-x" in conversation = a decision; the record still gets the stamp — the record is mandatory, the channel is flexible). Questions (`QST-`) follow the identical path with `type: question`.

## 6. Execution / resume — the hard part (exactly-once)

**Invariant: an approved action executes exactly once, verbatim, and never before approval.**

- **Claim-then-execute:** the executor first commits `execution.claimed_at` + `by` (the claim), *then* performs the action, then commits `executed_at` + `result`. A record with a claim but no `executed_at` after a timeout is flagged for **human** investigation — never silently retried, because the external action may or may not have happened (emails aren't idempotent).
- **Verbatim rule:** the executor performs `action` exactly as approved. Any deviation (recipient changed, artifact re-edited since approval — detected by comparing the artifact's git hash noted at approval time) ⇒ withdraw and re-request approval.
- **Who executes (MVP → later):** Phase 1: a human-initiated Claude session ("execute approved items" or "execute APR-x") — simplest, human-witnessed. Phase 3: a scheduled/triggered session polls for `approved && execution == null`. Same claim protocol either way.
- **Rejected:** reason feeds back to the requesting AI employee as rework input; new attempt = **new** approval record linked to the old one.

## 7. Control Panel application (Phase 2)

- **Stack:** Next.js (App Router, TypeScript) — server-rendered, no client-side repo tokens. Hosting: Vercel or equivalent (procurement gate). No database (ADR-0002): repo is read via GitHub App installation token; server-side cache TTL ≤ 5 min, on-demand revalidate after own writes.
- **Auth:** email magic-link (e.g. Auth.js); session email must match a `company/org/humans/` record or access is denied. Authorization per §3 evaluated server-side on every decision write.
- **Writes:** every decision/delegation/availability change = one commit via GitHub API to the record file. Commit author = the app; the human identity lives in the record's stamp fields and a `Decided-by: <human-id>` commit trailer. Write conflicts (record changed since read) ⇒ optimistic-concurrency error, UI re-loads the record.
- **Screens:** per PRD §3 — Inbox, Item Detail, Company Dashboard, Department Board, People & Routing admin, availability toggle. Artifact rendering MVP: markdown inline; anything else links to the file on GitHub.
- **Security:** all pages behind auth; People-gate items visible only to People/Finance seats + CEO (PRD open question 3, recommended answer adopted); no artifact content in URLs or logs; dependency and secrets scanning in CI; security employee reviews before deploy (EX-206).

## 8. Testing & verification

- **Unit:** routing resolution, SLA math (business days), state-machine transitions, idempotent notification logic.
- **Loop drill (EX-107/108):** one real item end to end + one deliberate SLA breach → assert hop chain, emails, exactly-once execution.
- **Panel acceptance (EX-208):** non-technical user approves an item start-to-finish without git/Claude Code.
- **Adversarial (security):** attempt to decide without authorization, replay a decision commit, execute an unapproved record, mutate the artifact post-approval — all must fail.

## 9. Alternatives considered

Recorded in ADRs: dedicated backend now (rejected — ADR-0002), GitHub Issues as queue (rejected as primary UX, fine as future notification bridge — ADR-0005), auto-approve on timeout (rejected absolutely — ADR-0004).
