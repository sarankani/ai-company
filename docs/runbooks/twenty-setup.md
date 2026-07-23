# Runbook: Twenty CRM Setup (EX-801)

This runbook covers provisioning and configuring Twenty CRM as Evalyn's business-record system of record.

## Prerequisites

- A server or container host (Docker-capable) OR a Twenty Cloud account
- A domain name (for self-hosted) or willingness to use Twenty Cloud's subdomain
- The Evalyn Control Panel deployed (for cross-linking, optional in Phase 1)

## Option A: Self-Hosted (Docker)

### 1. Clone and configure

```bash
git clone https://github.com/twentyhq/twenty.git
cd twenty
# Follow Twenty's official self-hosting guide: https://docs.twenty.com/start/self-hosting
```

### 2. Environment

Create a `.env` file with at minimum:

```env
# Postgres (can share the same Postgres instance as Evalyn Panel, separate DB)
PG_DATABASE_URL=postgres://twenty:password@localhost:5432/twenty

# Server
SERVER_URL=https://crm.evalyn.in
FRONT_BASE_URL=https://crm.evalyn.in

# Auth (generate strong secrets)
ACCESS_TOKEN_SECRET=...
LOGIN_TOKEN_SECRET=...
REFRESH_TOKEN_SECRET=...
FILE_TOKEN_SECRET=...
```

### 3. Start

```bash
docker compose up -d
```

### 4. Create workspace and API key

1. Open `https://crm.evalyn.in` in a browser
2. Sign up with your admin email
3. Create a workspace
4. Go to Settings → Developers & API → Generate API Key
5. Copy the key — this is `TWENTY_API_KEY`

### 5. Configure Evalyn

Set these environment variables wherever AI employees run:

```env
TWENTY_API_URL=https://crm.evalyn.in
TWENTY_API_KEY=<the-api-key-from-step-4>
```

Also set them in the Evalyn Panel's environment (for future SSO/linking).

### 6. Test

```bash
node scripts/twenty-client.mjs companies
```

Should list the default companies (or none if fresh).

## Option B: Twenty Cloud (Managed)

1. Sign up at https://app.twenty.com
2. Create a workspace
3. Go to Settings → Developers & API → Generate API Key
4. Set `TWENTY_API_URL=https://api.twenty.com` and `TWENTY_API_KEY=<key>`
5. Test with `node scripts/twenty-client.mjs companies`

## Initial Data Setup

### Create company stages

In Twenty, go to Settings → Data Model → Companies → Stage field. Ensure these stages exist (create if missing):

- prospect
- active
- dormant
- churned
- lead
- vendor

### Create opportunity stages

In Twenty, go to Settings → Data Model → Opportunities → Stage field. Ensure these stages exist:

- discovery
- scoping
- proposal
- negotiation
- won
- lost

### Create custom fields (optional, Phase 2)

For Evalyn-specific fields on companies:
- `industry` (text)
- `region` (text)
- `evalyn_id` (text) — for cross-referencing

For tasks (tickets):
- `severity` (text)
- `reported_by` (text)

## AI Employee Onboarding

Update each agent charter's CRM instructions:

**Old (custom CRM):**
```
Employees read/write via scripts/crm.mjs (env: PANEL_URL, CRM_AGENT_TOKEN, CRM_AGENT_ID)
```

**New (Twenty CRM):**
```
Employees read/write via scripts/twenty-client.mjs (env: TWENTY_API_URL, TWENTY_API_KEY).
Entity mapping: accounts/leads/vendors → companies; contacts → people; opportunities → opportunities;
tickets → tasks; everything else → notes or custom objects.
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `401 Unauthorized` | Check `TWENTY_API_KEY` is set and valid |
| `ECONNREFUSED` | Check `TWENTY_API_URL` points to the right host/port |
| GraphQL field not found | Twenty schema may have changed — check Twenty version and update `twenty-client.mjs` |
| Missing stages | Create them in Twenty Settings → Data Model |

## Security Notes

- Store `TWENTY_API_KEY` in a vault, never commit it.
- Twenty's GraphQL API has its own auth — the Evalyn Panel does not proxy it.
- Gate protocol is unchanged: AI employees draft, create APRs, and stop. The fact that Twenty stores the data doesn't change who approves.

## Rollback

If Twenty doesn't work out:
1. The custom CRM code is preserved in git history (main branch before EX-801 merge).
2. Revert the branch or cherry-pick the CRM module back.
3. Update `CLAUDE.md` and docs to point back to the custom CRM.

## References

- Twenty docs: https://docs.twenty.com
- Twenty GraphQL API: https://docs.twenty.com/start/graphql
- Evalyn issue: #110
- ADR: docs/adrs/0009-twenty-crm-replaces-custom-crm.md
