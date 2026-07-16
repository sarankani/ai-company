# Tech Spec 002 — Company CRM Module in the Control Panel

- **Status:** Draft — awaiting Saran
- **Owner:** developer (lead) · solutions-architect (design) · Saran (gates)
- **Plan:** [Plan 005](../plans/005-crm-module.md) · **ADR:** [ADR-0008](../adrs/0008-database-for-crm-business-records.md) · **Entity model:** `guides/company-os.md`

## 1. Overview

Add a full-lifecycle CRM to the existing panel (`panel/`): all 16 business-record types from the Company OS schema, stored in Postgres (ADR-0008), browsable and editable by every registered human (new `member` role), writable by AI employees through an authenticated API + CLI, with the existing git-native approval gates enforced on money/commitment stage transitions.

## 2. Data model

Generic 3-table design — the 16 entity types share one envelope and differ only in detail fields, which live in JSONB. The per-type contract (stages, transitions, gates, fields) is enforced in TypeScript, not DDL.

### 2.1 Tables

```sql
CREATE TABLE crm_records (
  id            text PRIMARY KEY,                  -- 'LEAD-20260716-001'
  type          text NOT NULL,                     -- entity slug, one of 16
  title         text NOT NULL,
  stage         text NOT NULL,
  owner         text NOT NULL,                     -- AI employee id ('sdr', 'finance', …)
  account_id    text REFERENCES crm_records(id),   -- hot link; NULL for accounts/vendors/assets
  summary       text NOT NULL DEFAULT '',
  fields        jsonb NOT NULL DEFAULT '{}',       -- per-type detail (amount, email, due date, …)
  apr_id        text,                              -- pending gate: 'APR-YYYYMMDD-NNN' or NULL
  pending_stage text,                              -- stage awaiting that APR
  created_by    text NOT NULL,
  updated_by    text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
-- indexes: (type, stage) · (account_id) · (owner) · (updated_at DESC) · GIN full-text over id/title/summary

CREATE TABLE crm_links (
  from_id text NOT NULL REFERENCES crm_records(id),
  to_id   text NOT NULL REFERENCES crm_records(id),
  rel     text NOT NULL,                           -- 'estimate-of', 'invoice-for', 'po-for', …
  PRIMARY KEY (from_id, to_id, rel)
);

CREATE TABLE crm_activities (                       -- append-only history
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  record_id text NOT NULL REFERENCES crm_records(id),
  at        timestamptz NOT NULL DEFAULT now(),
  actor     text NOT NULL,                          -- human id or agent id
  kind      text NOT NULL,                          -- created | updated | stage | comment | gate
  detail    jsonb NOT NULL DEFAULT '{}'
);
```

### 2.2 IDs

Human-readable, stable: `<PREFIX>-<yyyymmdd>-<seq3>` — same shape as APR/QST ids (`engine.ts nextId`). Prefixes: LEAD, CON, ACC, OPP, EST, QUO, PRO, PO, PRJ, SOW, MIL, INV, TIC, VEN, POUT, AST. Allocation queries the max sequence for the type+day and retries on primary-key conflict (concurrent writers).

### 2.3 Lifecycles (TS source of truth: `panel/lib/crm/lifecycles.ts`)

Stages and transitions per `guides/company-os.md` §"entities & their lifecycles". Gated transitions map to the existing `GATE_DEPT` gate ids (`panel/lib/engine.ts`):

| Transition | Gate |
|---|---|
| quotes `approved → sent` | external-comms |
| proposals `draft → sent` | external-comms |
| pos `verified → booked` | revenue-booking |
| opportunities `negotiation → won` | commitments |
| projects `kickoff → in-delivery` | commitments |
| milestones `delivered → accepted` | money |
| invoices `draft → sent` | money |
| purchase-orders-out `approved → ordered` | procurement |

## 3. Storage & drivers

Postgres everywhere, Drizzle ORM, one migration set (drizzle-kit). Driver selected in `panel/lib/crm/db.ts` from `DATABASE_URL`:

- `pglite://<dir>` or `pglite://memory` → PGlite (in-process; unit + e2e tests, zero services)
- Neon URL (or `DB_DRIVER=neon`) → `@neondatabase/serverless` HTTP driver (Vercel)
- anything else → `pg` node-postgres (Docker/local)

## 4. Access model

### 4.1 Humans — member RBAC (role × department matrix)

Every entity type has one **owning department**, declared in the lifecycle map: accounts, contacts, leads, opportunities, estimates, quotes, proposals, projects, sows, milestones → `sales-delivery`; pos, invoices → `people-finance`; tickets → `marketing-support`; vendors, purchase-orders-out, assets → `operations`.

A human's **CRM access level per department** is computed from their `roles` in `company/org/humans/<id>.md`:

| Grant | Effect |
|---|---|
| `- {department: <d>, seat: crm-viewer}` | read records of `<d>`'s entity types |
| `- {department: <d>, seat: crm-editor}` | + create/edit/comment/link/transition them |
| approver/deputy/head seat in `<d>` | implicit `crm-editor` on `<d>` |
| `ceo` seat | implicit `crm-editor` everywhere |
| no grant for `<d>` | `<d>`'s record types are **hidden** (lists, detail, search) |

Resolved by `crmAccess(human, type)` in `panel/lib/crm/rbac.ts` → `"none" | "view" | "edit"`. The existing frontmatter parser handles `crm-*` seats with zero changes; magic-link login already works for any registered email.

- **Guard change (security):** `authorized()` in `panel/lib/org.ts` must grant approval-decide rights only to chain seats — `ceo` or `approver|deputy|head` in the item's department. `crm-viewer`/`crm-editor` grants never confer decide rights, `/audit`, or `/admin` access.
- New members are added from `/admin` via the existing two-step people-gate pattern (propose with their dept×role grants → dual-stamp APR → apply commits the humans file).

### 4.2 AI employees — API + CLI

All writes flow through `panel/lib/crm/store.ts` (validation, ids, activities, gates — one write path). Routes under `/api/crm/*` authenticate via `requireCrmActor()`: a valid session cookie (human — RBAC matrix applies per §4.1) **or** `Authorization: Bearer $CRM_AGENT_TOKEN` + `X-Agent-Id: <employee>` (constant-time compare; agents act as editors — the gates, not RBAC, protect the critical transitions). `panel/middleware.ts` passes `/api/crm` through to in-route auth. A zero-dependency CLI `scripts/crm.mjs` (repo root) wraps the API for agent sessions: `create · get · list · update · move · link · comment · search`.

| Route | Methods |
|---|---|
| `/api/crm/records` | GET (list + filters) · POST (create) |
| `/api/crm/records/[id]` | GET (record + links + activities) · PATCH (fields/title/owner/summary) |
| `/api/crm/records/[id]/transition` | POST `{to}` — validates; gated → creates APR, returns 202 |
| `/api/crm/records/[id]/links` | POST `{rel, to}` |
| `/api/crm/records/[id]/comments` | POST `{text}` |
| `/api/crm/search` | GET `?q=` (full-text) |

## 5. Gate integration (`panel/lib/crm/gates.ts`)

- `requestGatedTransition(record, to, actor)` — builds a git-native APR via `createRecord()` with the **exact action** ("Move INV-20260716-001 from draft to sent — send invoice to <account>"), `artifact: "crm:<id>"`, commits it via `repoWriter()` (registry rebuilt), then stores `apr_id` + `pending_stage` on the row and logs a `gate` activity.
- `checkAndApplyGate(record)` — reads the APR fresh: `approved` → apply the stage, stamp the APR execution (claim/complete), clear `apr_id`, log activity; `rejected`/`withdrawn` → clear pending, log. Called from the record detail page and the transition API (pull-based; no engine changes, no webhooks).
- The item page renders `crm:<id>` artifacts as a link to `/crm/<type>/<id>` (they are not repo paths; `isRenderableArtifactPath()` already safely rejects them).
- ADR-0004 invariants untouched: the row's stage never moves without a named human's APR decision.

## 6. UI

| Route | Screen |
|---|---|
| `/crm` | Overview: per-type stage counts, recent activity, global search |
| `/crm/[type]` | Filterable list (stage/owner/account/text) + inline new-record form |
| `/crm/[type]/[id]` | Detail: envelope + fields (edit), valid-next-stage buttons (gated → request approval / pending APR chip / complete), related records (account 360), activity timeline |
| `/crm/pipeline` | Opportunity Kanban by stage (server-rendered; moves happen on detail) |

Reuses the panel's existing plain-CSS system (`.rows`, `.chip`, `.card`, `.tiles`, `.timeline`) and page structure (server components + server actions, `?err=` redirects). Nav gains a `CRM` link for every signed-in human.

## 7. Testing

- **Vitest:** lifecycle-map integrity (transitions closed over stages, gates reference real `GATE_DEPT` keys), id allocation, store CRUD/transition/activity semantics against PGlite in-memory.
- **Playwright:** member browse/filter/detail · create + stage-move + timeline · full gate loop (invoice draft→sent → APR in `/inbox` → approve → transition completes) · security (no session redirect, bad bearer 401, member blocked from `/admin`) · `/crm` routes added to the a11y spec.
- Python engine untouched — no parity work.

## 8. Environment

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Neon (prod) / Postgres (Docker/dev) / `pglite://…` (tests) |
| `CRM_AGENT_TOKEN` | bearer token for AI-employee API access |
| `PANEL_URL` | CLI target (defaults `http://localhost:3000`) |

All existing panel env vars unchanged.
