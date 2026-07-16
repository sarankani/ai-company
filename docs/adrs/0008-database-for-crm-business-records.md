# ADR-0008 — A relational database is the source of truth for CRM business records

- **Status:** Proposed — awaiting Saran
- **Source:** Plan 005 (Company CRM in the Control Panel) · partially supersedes [ADR-0002](0002-git-native-company-os-as-source-of-truth.md)

## Context

ADR-0002 made the git repo the single source of truth for all Company OS state. That has served the governance records well: approvals, questions, and org config are low-volume, audit-critical, and human-decided — git commits *are* their audit trail.

The 16 business-record types (`guides/company-os.md`: accounts, contacts, leads, opportunities, estimates, quotes, proposals, customer POs, projects, SOWs, milestones, invoices, tickets, vendors, outbound POs, assets) were never materialized as files. They have a different shape: high churn (an SDR touches a lead many times a day), relational access patterns (pipeline by stage, records by account, cross-entity search), and concurrent writers (multiple AI employees working the same account). Storing them as markdown files would flood git history with record noise, make every list view a full-directory parse, and give no useful querying. Saran has decided the CRM gets a real database.

## Decision

**Postgres becomes the source of truth for business records; git remains the source of truth for governance records.** Precisely:

- The 16 business-record entity types live in a Postgres database (**Supabase Postgres** in production — Saran's choice, which also supplies **Supabase Realtime** for live notifications; any Postgres in Docker/dev; PGlite in tests), accessed exclusively through the panel's CRM store (`panel/lib/crm/`) — one write path that enforces lifecycle validation, id allocation, RBAC, and append-only activity history.
- Approvals (`company/approvals/`), questions (`company/questions/`), org config (`company/org/`), docs, and memory **stay git-native, unchanged**. The approval engine, its state machine, and ADR-0003/0004/0005 are untouched.
- The two systems meet at the gates: a gated CRM stage transition creates a normal git-native APR record and stores the APR id on the database row; the row's stage does not move until a human decides the APR. Every gate decision therefore remains a git commit with a `Decided-by:` trailer.
- Business records carry their own append-only audit trail in the database (`crm_activities`), attributing every mutation to a named human or AI employee.

## Consequences

- The panel is no longer fully stateless: it owns a database. Backup/restore of the CRM data becomes an operational responsibility (Supabase automated backups in production; documented in the runbook).
- Humans and AI employees get in-app notifications from a `crm_notifications` table; Supabase Realtime pushes the inserts live to the panel, and agents poll the same feed through the CRM API.
- Business-record queries (pipeline views, account 360, search) become cheap and correct instead of parse-the-repo approximations.
- `company/registry.md` indexes governance records only; the CRM index lives at the panel's `/crm`.
- AI employees read/write business records through the panel's API/CLI instead of repo files — one validated write path instead of free-form file edits.
- The audit story splits in two: git history for decisions and org changes, `crm_activities` for record mutations. Both are append-only and attributable.

## Alternatives considered

**Business records as markdown files (extend ADR-0002 as-is)** — rejected by decision: no relational queries, git history noise, whole-directory parses per page view, merge conflicts between concurrent agent writers. **A database for everything (approvals too)** — rejected: the approval loop's git-commit audit spine is proven, human-legible, and load-bearing for trust (EX-208); migrating it buys nothing and risks the hardest guarantees (exactly-once, silence-never-consents). **SQLite** — rejected for production: Vercel's filesystem is ephemeral; a hosted Postgres keeps one dialect across prod/dev/test. **Neon** — a fine hosted Postgres, but Supabase was chosen because the same platform provides the realtime notification channel, so one vendor covers both needs.
