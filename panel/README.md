# Evalyn Control Panel

Stateless web client of the Company OS (ADR-0002): reads `company/` records,
writes decisions as commits (EX-203+). No database — git is the source of
truth and the audit log.

## Run (dev)

```bash
cd panel
npm install
SESSION_SECRET=dev-secret npm run dev
# open http://localhost:3000 — sign in with a humans-registry email;
# without SMTP configured the magic link is printed to this console.
```

## Environment

| Variable | Purpose |
|---|---|
| `SESSION_SECRET` | HMAC key for magic-link + session tokens (required) |
| `PANEL_BASE_URL` | Public base URL used in magic links (default `http://localhost:3000`) |
| `LOCAL_REPO_PATH` | Path to a company-repo checkout (default: parent directory) |
| `GITHUB_REPO` + `GITHUB_TOKEN` | Production read/write mode via GitHub API (overrides local mode) |
| `GITHUB_BRANCH` | Branch decisions are committed to in production (default `main`) |
| `PANEL_BASE_URL` | Public base URL used in magic links |
| `SMTP_HOST/PORT/SECURE/USER/PASS`, `NOTIFY_FROM` | Magic-link email delivery (nodemailer); with `SMTP_HOST` set, links are emailed and never logged |
| `AUTH_DEV_LOG=1` | Dev only — print magic links to the server console |
| `DATABASE_URL` | CRM database (ADR-0008): Supabase Postgres in prod (pooled URL), any Postgres in Docker, `pglite://<dir>` for tests; **unset = zero-setup local PGlite** (`panel/.crm-data`, auto-migrated) |
| `CRM_AGENT_TOKEN` | Bearer token AI employees use against `/api/crm` (`X-Agent-Id` names the employee) |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional — live notification push via Supabase Realtime |

Full reference: `.env.example`.

## CRM (EX-702…709, ADR-0008)

Business records (all 16 Company OS entity types) live in **Postgres**, not the repo — git stays the source of truth for approvals/questions/org only. Screens: `/crm` (overview + search), `/crm/<type>` (lists + create), `/crm/<type>/<id>` (detail, stage moves, activity), `/crm/pipeline` (opportunity Kanban), `/crm/notifications`. Access is a **role × department matrix**: `crm-viewer`/`crm-editor` grants per department in `company/org/humans/<id>.md` (chain seats get implicit editor on their department, the ceo seat everywhere; no grant = hidden; grants never confer approval authority). New members are added from `/admin` through the people gate.

- **Setup:** `npm run db:migrate` (against `DATABASE_URL`); optional demo data `npm run db:seed` (**dev/e2e only** — the script refuses a real Postgres unless `CRM_SEED_FORCE=1`). With no `DATABASE_URL`, a local PGlite directory is created and migrated automatically.
- **CI:** merges to `main` that touch `panel/drizzle/**` (or the migrator) auto-apply pending migrations to production via `.github/workflows/crm-migrate.yml` — once the `DATABASE_URL` repo secret is set (until then the job skips green). First-time run after provisioning: trigger it manually via *Actions → CRM DB migrate → Run workflow*. Seeding is never run by CI.
- **Supabase (production):** create a project, set `DATABASE_URL` to the pooled connection string, run `db:migrate`; for live notifications add `crm_notifications` to the `supabase_realtime` publication and set the two `NEXT_PUBLIC_SUPABASE_*` vars.
- **Gates:** money/commitment stage transitions (invoice send, PO booking, opp won, …) file a normal git-native APR and stay parked until a human decides; the record page reconciles and applies the outcome (exactly-once execution stamp on the APR).
- **AI employees:** `node scripts/crm.mjs …` (repo root) or `/api/crm` with `Authorization: Bearer $CRM_AGENT_TOKEN` + `X-Agent-Id`.

## Deploy (EX-207)

Runbook: `docs/runbooks/panel-deploy.md` (go/no-go checklist, rollback, monitoring). Two paths: **Vercel** (root = `panel/`, env vars as Project settings, no Dockerfile) or a **container host** via `Dockerfile` (Next `output: "standalone"`, slim non-root image). The repo checkout is not in the image — production reads the Company OS via the GitHub API. The actual deploy is a **human-authorized gate**.

## Writes (EX-203)

Every decision is **one commit**: the record file (stamp/decision per the
same rules as `scripts/approval_engine.py`) plus the rebuilt `registry.md`,
with a `Decided-by: <human-id>` trailer. Local mode commits to the checkout;
production uses the Git Data API (blobs → tree → commit → ref), so the write
is atomic and a moved branch rejects the commit (optimistic concurrency —
the UI reloads instead of clobbering). The TS engine port lives in
`lib/engine.ts` and is kept in lockstep with the Python engine; the e2e
suite asserts the Python validator accepts panel-written records.

## E2E smoke suite

`e2e/smoke.mjs` drives the real UI (Playwright) against a **throwaway
clone** — never the live checkout; it commits decisions. Run instructions in
the file header. Covers: authz + people-gate visibility, exact-once commit
shape, QST answers, dual approval, conflict rejection, follow-ups.

## Scope shipped per task

- **EX-202:** scaffold · magic-link auth (1:1 humans registry, 7-day
  sessions) · repo read layer (local/GitHub, ≤5-min cache) · Inbox skeleton
- **EX-203 (this):** Item Detail decide surface — approve (conditions) /
  reject (reason required) / delegate (authorized only) / answer / follow-up,
  decisions as stamped commits, dual-approval meter, timeline, "Next (N)"
- **EX-204:** Company Dashboard (7 live tiles + CEO escalation strip) +
  Department Board (state groups, composable URL filters); People-gate work
  absent from all counts for unauthorized seats
- **EX-205:** one-tap availability (top-bar → one commit; routing skips from
  the next scan) + People & Routing admin: seat changes as a gated two-step —
  Head proposes (people-gate record) → dual approval on the decide surface →
  CEO applies via the exactly-once claim/complete path in one commit
