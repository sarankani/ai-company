# ADR-0009 — Twenty CRM Replaces the Custom CRM Module

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-07-24 |
| **Context** | EX-801 / Issue #110 |
| **Deciders** | Saran (Founder/CEO) — strategy gate |
| **Supersedes** | ADR-0008 (partially — CRM database choice); Plan 005 (CRM module) |

## Context

In July 2026, Evalyn built a custom CRM module inside the Control Panel (Phase 5, EX-7xx, Plan 005, ADR-0008). It stored 16 business-record entity types in Postgres via Drizzle ORM, with custom screens, API routes, RBAC, lifecycle validation, and a gate bridge to the approval loop. It was merged via PR #88 and deployed.

The custom CRM works, but it requires ongoing engineering investment for features that are table stakes in any CRM: pipelines, kanban views, activity timelines, email integration, search, and a polished mobile experience. Every hour spent re-implementing these is an hour not spent on Evalyn's core mission — the AI employee operating system and the human-in-the-loop approval infrastructure.

## Decision

**Replace the custom CRM module with an integration to the open-source Twenty CRM** (https://github.com/twentyhq/twenty). Twenty is Evalyn's system of record for business records; the custom CRM code is removed.

The integration approach is:
- **API client, not embedded** — `scripts/twenty-client.mjs` is a zero-dependency GraphQL CLI that AI employees use to read/write Twenty records. The Control Panel stays focused on governance (Inbox, Dashboard, Audit, Admin).
- **Gate protocol unchanged** — AI employees still draft, create approval records, and stop at human gates. The only change is which backend stores the business data.
- **Green-field start acceptable** — no data migration from the custom CRM to Twenty. The custom CRM held seed/demo data only.

## Consequences

### Positive
- **Feature-complete CRM out of the box** — pipelines, kanban, activity feeds, email sync, search, mobile — without engineering cost.
- **Modern stack alignment** — Twenty uses TypeScript, React, NestJS, GraphQL — the same technologies Evalyn's engineering team knows.
- **Active open-source community** — maintained by twentyhq, regular releases, no vendor lock-in (self-hostable).
- **Reduced maintenance surface** — ~3,500 lines of custom CRM code removed from the panel (schema, store, screens, API routes, tests, migrations, seed scripts).
- **Panel stays focused** — the Control Panel returns to its core mission: approvals, routing, audit, and human decision-making.

### Negative
- **Two systems to operate** — Evalyn now runs the Control Panel + Twenty CRM, not a single monolith. Operational overhead increases slightly.
- **No embedded CRM in the panel** — humans navigate to Twenty for business records. SSO between Panel and Twenty is future work (out of scope for EX-801).
- **GraphQL learning curve** — AI employee charters need Twenty's GraphQL schema knowledge (documented in `scripts/twenty-client.mjs` and `guides/integrations.md`).
- **Custom entity mapping required** — Evalyn's 16 entity types map to Twenty's native types (companies, people, opportunities, tasks, notes) plus custom objects where needed. Some fidelity loss on custom fields until Twenty custom objects mature.

## Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| **Continue the custom CRM** | Rejected — the engineering cost of building pipelines, kanban, email sync, and mobile is unjustified when an excellent open-source option exists. Opportunity cost is too high. |
| **Salesforce/HubSpot (commercial)** | Rejected — vendor lock-in, per-seat pricing, and complexity exceed Evalyn's needs. Twenty is open-source and self-hostable. |
| **Supabase + custom UI (extend current)** | Rejected — still requires building all CRM UI/UX from scratch. The schema was already in Supabase Postgres; the gap was the interface, not the database. |
| **Embed Twenty as an iframe/module** | Rejected — adds coupling and security complexity. A clean API client boundary is simpler and more maintainable. Can be revisited if SSO is needed. |

## What Was Removed

- `panel/lib/crm/` — 12 TypeScript modules (api-auth, db, gates, ids, lifecycles, migrate, rbac, schema, session, store)
- `panel/app/crm/` — 7 pages + components (overview, list, detail, pipeline, notifications, actions, live-notify)
- `panel/app/api/crm/` — 6 API routes (records, record detail, comments, links, transition, search, notifications)
- `panel/drizzle/` — schema + SQL migration
- `panel/scripts/` — crm-seed.ts, db-migrate.ts, load-env.ts
- `scripts/crm.mjs` — the AI employee CLI tool
- `panel/test/specs/crm.spec.ts` — e2e CRM tests
- `panel/test/unit/crm-{lifecycles,rbac,store}.test.ts` — unit tests
- `.github/workflows/crm-migrate.yml` — CI migration job
- Dependencies: `drizzle-orm`, `pg`, `@electric-sql/pglite`, `@types/pg`, `@supabase/supabase-js`, `tsx`

## What Was Added

- `scripts/twenty-client.mjs` — zero-dependency GraphQL CLI for AI employees
- `docs/runbooks/twenty-setup.md` — self-hosting/cloud setup instructions
- Updated docs: `CLAUDE.md` §3, `guides/company-os.md`, `guides/integrations.md`, `company/registry.md`
- Updated env vars: `TWENTY_API_URL`, `TWENTY_API_KEY` (replaced `DATABASE_URL`, `CRM_AGENT_TOKEN`, `NEXT_PUBLIC_SUPABASE_*`)

## Entity Mapping (Evalyn → Twenty)

| Evalyn | Twenty | Notes |
|---|---|---|
| accounts, leads, vendors | companies | Use company stage field |
| contacts | people | Linked to companies |
| opportunities | opportunities | Native pipeline |
| tickets | tasks | Custom fields for severity/reporter |
| projects, milestones, invoices, estimates, quotes, SOWs, POs, assets | notes / custom objects | Map as needed |

## Related

- Issue #110: EX-801 — Integrate Twenty CRM and Remove Current Custom CRM
- Plan 005: CRM module (superseded)
- ADR-0008: Database for CRM business records (superseded for CRM; the general principle of separating governance from business records still holds)
- Tech Spec 002: CRM module (historical)
