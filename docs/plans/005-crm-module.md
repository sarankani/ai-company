# Plan 005 — Company CRM in the Control Panel

- **Status:** Merged to main via [PR #88](https://github.com/sarankani/ai-company/pull/88) (2026-07-19; 179 unit + 31 e2e + 32 engine tests green, prod build green). EX-702…707 + 709 **done**. Remaining human gates: EX-701 — flip ADR-0008 to Accepted (merge signals intent, the ADR status edit makes it formal) · EX-708 — provision Supabase, set `DATABASE_URL`/`CRM_AGENT_TOKEN` on Vercel, authorize the deploy.
- **Epic:** E7 — Company CRM in the Control Panel
- **Owner:** developer (lead) · product-manager (scope) · Saran (gates)
- **Related:** [Tech Spec 002](../specs/tech-spec-002-crm-module.md) · [ADR-0008](../adrs/0008-database-for-crm-business-records.md) · `guides/company-os.md` · `panel/`
- **Numbering:** the CRM track uses **EX-7xx**. (EX-4xx/5xx stay reserved with Plan 001 Phases 4–5; EX-6xx is the Plan 004 quality track.)

## 1. Why

The panel runs the company's governance (approvals, routing, audit) but none of its **business**. The 16 business-record types in `guides/company-os.md` — the actual CRM the value chain runs on — were never materialized: no storage, no screens, no records. AI employees can't coordinate lead→cash work through records that don't exist, and humans have no place to see the pipeline.

Saran's decisions (2026-07-16): build the **full lifecycle** (all 16 entity types) inside the existing panel; give members **RBAC as a role × department matrix** (`crm-viewer`/`crm-editor` grants per department; seat-holders get editor on their department implicitly, CEO everywhere; no grant = hidden — Tech Spec 002 §4.1); store business records in a **real database** (Postgres) — approvals and org stay git-native (ADR-0008 partially supersedes ADR-0002).

## 2. Goal & definition of done

Any registered human signs into the panel and can browse, create, edit, and advance every business-record type through its lifecycle; AI employees do the same through an authenticated API/CLI; every money/commitment stage transition stops at a git-native APR gate exactly like today's approvals; every mutation is attributed and append-only logged.

**Phase exit:** EX-701…708 done; a lead can be walked lead→opportunity→won and an invoice draft→sent (through the money gate, decided in the panel inbox) end to end; unit + e2e suites green in CI.

## 3. Task board

States: `todo` · `in-progress` · `blocked` · `waiting-on-gate` · `in-review` · `done`.

Epic: [E7 #78](https://github.com/sarankani/ai-company/issues/78)

| ID | Task | Owner | Gate | Blocked by | Blocks | Issue |
|---|---|---|---|---|---|---|
| EX-701 | Plan 005 + ADR-0008 + Tech Spec 002 approved | product-manager + solutions-architect | Saran accepts ADR-0008 | — | EX-702 | [#79](https://github.com/sarankani/ai-company/issues/79) |
| EX-702 | DB foundation: schema, drivers, lifecycles, ids, store | developer | merge via loop | EX-701 | EX-703…707 | [#80](https://github.com/sarankani/ai-company/issues/80) |
| EX-703 | Read UI (/crm, lists, detail) + member role guard | developer | merge via loop | EX-702 | EX-708 | [#81](https://github.com/sarankani/ai-company/issues/81) |
| EX-704 | Human writes: create/edit/comment/link/transition actions | developer | merge via loop | EX-702, EX-703 | EX-708 | [#82](https://github.com/sarankani/ai-company/issues/82) |
| EX-705 | Agent API + CLI (`/api/crm/*`, `scripts/crm.mjs`) | developer | merge via loop | EX-702 | EX-708 | [#83](https://github.com/sarankani/ai-company/issues/83) |
| EX-706 | Gate integration (APR-linked transitions) | developer | merge via loop | EX-702, EX-704 | EX-708 | [#84](https://github.com/sarankani/ai-company/issues/84) |
| EX-707 | Pipeline Kanban, global search, admin add-member | developer | merge via loop | EX-703, EX-704 | EX-708 | [#85](https://github.com/sarankani/ai-company/issues/85) |
| EX-708 | Tests (Vitest + Playwright), CI, deploy readiness | tester + devops | merge + Saran deploy gate | EX-703…707 | phase exit | [#86](https://github.com/sarankani/ai-company/issues/86) |
| EX-709 | Realtime notifications — bell UI, Supabase push, agent feed | developer | merge via loop | EX-702 | EX-708 | [#87](https://github.com/sarankani/ai-company/issues/87) |

> **Stack amendment (Saran, 2026-07-16):** production Postgres is **Supabase** (not Neon), so the same platform provides Supabase Realtime for live human/AI notifications (`crm_notifications` table; ADR-0008 updated).

## 4. Task register

Template: **US** user story · **AC** acceptance criteria · **OS** out of scope.

### EX-701 — Docs approved
- **US:** As the Founder, I want the CRM's architecture decided on paper before code, because a database is a hard-to-reverse addition to a git-native system.
- **AC:** ADR-0008 accepted by Saran; Plan 005 and Tech Spec 002 approved; docs indexes updated.
- **OS:** any implementation.

### EX-702 — DB foundation
- **US:** As every later task, I want one validated write path over Postgres so CRM state is queryable, concurrent-safe, and attributed.
- **AC:** `panel/lib/crm/{schema,db,lifecycles,ids,store}.ts` + drizzle migration; all 16 lifecycles encoded with gates mapped to real `GATE_DEPT` keys; every mutation writes an activity row transactionally; PGlite/pg/Neon drivers selected by `DATABASE_URL`; seed script.
- **OS:** UI, API routes, gate wiring.

### EX-703 — Read UI + member RBAC
- **US:** As any registered human, I want to sign in and see the company's records my grants allow — pipeline, projects, invoices — without touching git.
- **AC:** `/crm` overview, `/crm/[type]` filterable lists, `/crm/[type]/[id]` detail with timeline and related records; CRM nav for all humans with any grant; RBAC matrix enforced server-side on every list/detail/search (no grant = hidden); `authorized()` grants decide rights only to chain/ceo seats — `crm-*` grants never decide approvals; `/audit`, `/admin` unchanged.
- **OS:** writes (EX-704), Kanban/search (EX-707).

### EX-704 — Human writes
- **US:** As a member with editor grants, I want to create and work records from the panel so the CRM is operable by people, not just agents.
- **AC:** new-record form per type; edit fields/title/owner/summary; comments; links; ungated stage transitions with validation; all writes require `crm-editor` (or implicit seat/ceo editor) on the type's department — viewers get read-only UI and server-side rejection; `?err=` error surfacing; all writes attributed + logged.
- **OS:** gated transitions (EX-706).

### EX-705 — Agent API + CLI
- **US:** As an AI employee, I want to read/write business records through one validated path so my work lands in the system of record.
- **AC:** `/api/crm/*` routes with session-or-bearer auth (constant-time compare); middleware pass-through; `scripts/crm.mjs` (zero-dep) covers create/get/list/update/move/link/comment/search; CLAUDE.md §3 and `company/registry.md` updated to point employees at the CRM.
- **OS:** webhooks; MCP server wrapping.

### EX-706 — Gate integration
- **US:** As the Founder, I want money/commitment stage moves to stop at the same approval inbox as everything else — a database must not weaken a single gate.
- **AC:** 8 gated transitions (Tech Spec 002 §2.3) create APRs with the exact action; row stores `apr_id`/`pending_stage` and cannot move until the APR is approved; approved → transition applies + APR execution stamped; rejected → pending cleared, rework noted; item page links `crm:` artifacts to the record; ADR-0004 invariants untouched.
- **OS:** new gate types; engine changes.

### EX-707 — Pipeline, search, add-member
- **US:** As sales/leadership, I want the pipeline at a glance and any record findable; as a Head, I want to add members through the gated org path.
- **AC:** `/crm/pipeline` opportunity Kanban; full-text search on `/crm`; add-member propose→approve→apply flow in `/admin` (people gate, dual stamp, one commit creating the humans file).
- **OS:** drag-and-drop; bulk imports.

### EX-708 — Tests, CI, deploy readiness
- **US:** As the Founder, I want the CRM held to the panel's Phase-6 quality bar before it carries real customer data.
- **AC:** Vitest (lifecycles, ids, store) + Playwright (browse, write, full gate loop, security, a11y) green in existing CI jobs; Neon provisioning + env vars documented; `panel/README.md` updated; deploy authorized by Saran.
- **OS:** load testing; backup automation beyond Neon defaults.

## 5. Risks

1. **A member gaining decide rights** — the `authorized()` guard change (chain/ceo seats only) is load-bearing; covered by unit + e2e security tests (EX-703, EX-708). RBAC is additionally enforced server-side per request, never only in the UI.
2. **Gate bypass via direct DB access** — mitigated: the store is the only write path in code; `CRM_AGENT_TOKEN` holders can still only move stages through the transition endpoint, which enforces gates. Raw SQL access is an ops-level secret like `GITHUB_TOKEN` today.
3. **Two audit systems drift** — every gate interaction is logged on both sides (APR record ↔ `crm_activities` gate entries) with cross-referencing ids.
4. **Vercel serverless + Postgres connection limits** — Neon HTTP driver is per-request, no pooling needed.
