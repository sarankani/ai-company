# Runbook — Control Panel production deploy (EX-207)

Owner: `devops` · Gate: **Founder authorizes go/no-go** (this is a deploy gate — never deploy autonomously). Prereq: EX-206 accepted (done, PR #43).

The panel is a **stateless** client of the Company OS (ADR-0002): no database. In production it reads records and writes decisions via the GitHub API, so a deploy is just the Next.js app plus secrets — a rollback is redeploying the previous build, and the file-based approval loop keeps working even if the panel is down.

---

## 1. Founder decisions required before go-live

| Decision | Why | Status |
|---|---|---|
| **Hosting** (Vercel / container host) | Procurement gate; shapes the deploy path | ☐ TBD |
| **`SESSION_SECRET`** | Signs magic-link + session tokens | ☐ provision from vault (`openssl rand -base64 48`) |
| **`GITHUB_TOKEN`** | Read records + commit decisions | ☐ fine-grained, THIS repo only, `contents:write`, rotate |
| **SMTP creds** | Deliver magic links (links are no longer logged — EX-206 H2) | ☐ host/port/user/pass + `NOTIFY_FROM` |
| **Domain** | `PANEL_BASE_URL` for links | ☐ e.g. `panel.evalyn.in` |

Full env reference: `panel/.env.example`.

## 2. Two supported deploy paths

**Vercel** (tech-spec default): import the repo → **Settings → General → Root Directory = `panel`** (required — the app is in a subdirectory) → Framework Preset auto-detects **Next.js** → add the env vars from `.env.example` as Project Environment Variables (Production) → deploy. No custom build command, no Dockerfile, no Output Directory override — Vercel builds Next natively. `next.config.mjs` scopes `output: "standalone"` to non-Vercel builds (VERCEL=1), so it doesn't trip Vercel's static-output detection ("No Output Directory named public"). Env var names must be plain (never `NEXT_PUBLIC_*` for secrets). `GITHUB_TOKEN` = fine-grained PAT, this repo only, Contents read+write.

**Container host** (Fly.io / Render / VPS): `panel/Dockerfile` builds a slim non-root standalone image (`output: "standalone"`). Inject the same env vars as runtime secrets. `docker build -t evalyn-panel panel/ && docker run -p 3000:3000 --env-file .env.local evalyn-panel`.

Either way the repo checkout is **not** in the image — production reads via the GitHub API.

## 3. Pre-go-live checklist (all must pass)

- [ ] `panel-ci.yml` green on the deploy commit: build + `npm audit --audit-level=high` + secret scan
- [ ] Auth on every route (middleware + per-page `verifySession`) — verified in EX-206
- [ ] `SESSION_SECRET` set from a vault, not committed; `GITHUB_TOKEN` scoped to this repo + least privilege
- [ ] `NODE_ENV=production` so the session cookie is `Secure`
- [ ] HTTPS only; `PANEL_BASE_URL` matches the served domain (magic links must resolve)
- [ ] SMTP verified end-to-end: request a link for a seat-holder, confirm it arrives and signs in (no link in logs)
- [ ] `GITHUB_TOKEN` can commit — do one real decision on a throwaway record, confirm the commit + `Decided-by` trailer, then revert it
- [ ] Monitoring wired (§4)
- [ ] Rollback rehearsed (§5)
- [ ] Founder authorizes go/no-go

## 4. Monitoring & alerts

- **App errors:** host-native (Vercel/Fly logs) + an uptime check on `/signin` (returns 200 unauthenticated).
- **SLA-job silence:** `approval-sla-job.yml` runs every 15 min and commits when it reassigns; alert if it hasn't succeeded in >30 min (a silent SLA job means gates stop escalating — higher impact than the panel being down).
- **No secrets in logs:** magic links are not logged when SMTP is set (EX-206 H2); spot-check after go-live.
- **Slack notifications (EX-303):** the SLA job posts gate events (assigned / 50%-SLA / escalation) to Slack with a deep link to the item. Config lives on the **repo**, not the panel:
  - `SLACK_WEBHOOK_URL` (repo **variable**) — posts to a channel. Works today, no environment needed.
  - `PANEL_BASE_URL` (repo **variable**) — makes the deep links land on `/item/:id` (auth-gated) instead of the GitHub file.
  - `SLACK_BOT_TOKEN` (prod-environment **secret**) — to DM approvers individually with threading, add a `slack_id` to each `company/org/humans/*.md` **and** add `environment: production` to the `scan` job in `approval-sla-job.yml`. ⚠️ If the production environment has required-reviewer protection, that would gate this scheduled heartbeat — prefer a repo-level secret (or no protection) for the automated job. Slack down/unconfigured never blocks routing — email still delivers.

## 5. Rollback (rehearse before go-live)

1. **Vercel:** promote the previous deployment (instant). **Container:** redeploy the previous image tag.
2. The panel is stateless — no migrations, no data to roll back. Records already committed by the panel stay valid (they're normal Company OS records).
3. **Fallback while the panel is down:** the file-based loop is unaffected — humans decide via `scripts/approval_engine.py decide …` + push, or by merging the gated PR, exactly as during Phase 1. Note this in the go-live comms so no gate stalls.
4. Rehearsal: deploy, note the URL, redeploy previous, confirm the app serves the prior build and a decision still commits.

## 6. Residuals carried from the security review (EX-206)

- **Login-token replay** — accepted 15-minute single-window replay (Founder decision); panel stays stateless. Revisit if a higher-assurance posture is needed.
- **postcss moderate advisory** — transitive via Next build tooling, not exploitable in our static-CSS app; unresolvable without a breaking Next downgrade. `npm audit --audit-level=high` in CI intentionally does not fail on it.
- **Dual-control** — graduated separation of duties (Founder decision); distinct People-gate approvers auto-required once a 2nd qualified seat is hired.

## 7. Post-deploy smoke (EX-208 feeds from this)

Sign in as a seat-holder via emailed link → open a real pending item → approve → confirm the commit landed and the record shows `approved` + executed. That is also the EX-208 acceptance scenario (a non-technical human decides without touching git/CLI).
