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
| `GITHUB_REPO` + `GITHUB_TOKEN` | Production read mode via GitHub contents API (overrides local mode) |
| `SMTP_*`, `NOTIFY_FROM` | Magic-link email delivery (wired at deploy, EX-207) |

## Scope shipped per task

- **EX-202 (this):** scaffold · magic-link auth (1:1 humans registry, 7-day
  sessions) · repo read layer (local/GitHub, ≤5-min cache) · Inbox skeleton
- **EX-203:** Item Detail + decision panel (approve/reject/delegate/follow-up)
- **EX-204:** Company Dashboard + Department Board
- **EX-205:** availability toggle + People & Routing admin
