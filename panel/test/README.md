# Panel tests

Two layers, both built on the EX-601 fixtures (`test/fixtures/`):

| Command | What runs | Needs a browser? |
|---|---|---|
| `npm run test:fixtures` | `test/self-check.mjs` — the fixtures harness self-check | no |
| `npm run test:e2e` | `playwright test` — the browser e2e suite (`test/specs/*.spec.ts`) | yes |

## E2E suite (EX-602)

A `@playwright/test` project (config: `../playwright.config.ts`) that replaced
the hand-rolled `e2e/smoke.mjs`. Each **worker** gets its own isolated panel via
the fixtures (`test/fixtures/playwright.ts`: a throwaway repo clone + `next dev`
with caching off), and the clone is **reset between every test** — no shared
state, no warm-cache flakiness.

Specs are grouped by area, mirroring the retired smoke checks 1:1:

- `auth.spec.ts` — magic-link sign-in; unknown emails not enumerated
- `inbox.spec.ts` — seat visibility; restricted deep-link card
- `item-decide.spec.ts` — detail, follow-up, optimistic concurrency, approve, read-only, question answer
- `dashboard-board.spec.ts` — department tiles + board filters
- `dual-approval.spec.ts` — People-gate two-stamp; CEO dashboard visibility
- `availability.spec.ts` — availability toggle + EX-301 immediate reassignment
- `admin.spec.ts` — gated two-step seat change (propose → dual-approve → apply)
- `audit.spec.ts` — decision ledger, gate/date filters, Head/CEO-only
- `security.spec.ts` — EX-206 regressions (artifact bypass/traversal, open redirect)

### Browser

The suite reuses the pre-installed chromium when present (CI pins it at
`/opt/pw-browsers`; the config points `executablePath` there, overridable with
`PLAYWRIGHT_CHROMIUM_PATH`). On a dev machine run `npx playwright install
chromium` once. Python 3 must be on PATH (the fixtures seed via
`scripts/approval_engine.py`).

Failure artifacts (trace on first retry, screenshots) and the HTML report land
in `playwright-report/` and `test-results/` (git-ignored). CI wiring is **EX-603**.
