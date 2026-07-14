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
| `SMTP_*`, `NOTIFY_FROM` | Magic-link email delivery (wired at deploy, EX-207) |

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
