# Panel test fixtures (EX-601)

A one-call harness for deterministic panel tests: spin up an **isolated
throwaway clone** of the company repo, seed exact records / humans /
departments, launch the panel against it with caching off, `reset()` between
tests, and tear it all down. This replaces the ad-hoc clone/seed/`CACHE_TTL_MS=0`
pattern that `panel/e2e/smoke.mjs` open-codes today.

> Owner: `tester` + `developer` · Plan 004 Phase 6 · issue #54.
> The full `smoke.mjs` → `@playwright/test` migration is **EX-602**; this task
> only provides the fixtures and one spec that consumes them.

## Why

- **Deterministic.** Each fixture is its own temp git clone, on its own port,
  with its own ephemeral `SESSION_SECRET`. `CACHE_TTL_MS=0` means the running
  panel sees seeded/reset records immediately — no warm-cache flakiness (the
  motivating regression), no server restart on `reset()`.
- **Safe.** The harness never touches the real `company/` tree, and it strips
  `GITHUB_*` / `SMTP_*` from the panel's env so a test can't read/write GitHub
  or send real email.
- **Cheap to write.** Seeding is one call per record/human/department.

## Quick start

```js
import { createFixture } from "./test/fixtures/index.mjs";

const fx = await createFixture();               // isolated clone of HEAD
await fx.seedApproval({                          // seed a gate record
  gate: "merge-deploy", priority: "P1",
  action: "Merge PR #1 into main",               // the exact action (required)
});
await fx.startPanel();                            // next dev, caching off, ephemeral port
fx.snapshot();                                    // mark the per-test baseline

const browser = await fx.launchBrowser();         // chromium (reuses /opt/pw-browsers)
const page = await (await browser.newContext()).newPage();
await fx.signIn(page, "saravanan@vitetech.in");   // magic-link sign-in via the log
// ... assertions against fx.baseUrl ...

await fx.reset();                                 // restore baseline — no state leak
await browser.close();
await fx.teardown();                              // kill server + remove temp clone
```

## API

`createFixture({ sourceRepo? }) → Fixture` — clone the current checkout (or
`sourceRepo`) into a fresh temp dir with a throwaway git identity. The pristine
clone is the default `reset()` baseline until you call `snapshot()`.

### Seeding (each auto-commits unless `commit: false`)
- `seedApproval({ action, gate?, priority?, requestedBy?, artifact?, summary?, links?, type? }) → id`
  — create a record via `scripts/approval_engine.py` and return its id (`APR-…`).
- `seedQuestion(opts) → id` — same, `type: "question"` (`QST-…`).
- `seedHuman({ id, email, name?, title?, availability?, oooUntil?, slackId?, roles? }) → id`
  — write `company/org/humans/<id>.md`, including `slack_id` for the Slack/DM
  and restricted-visibility paths (UC2).
- `seedDepartment({ id, name, employees?, gates? }) → id` — append a
  parser-shaped row to `company/org/departments.md`.
- `writeFile(relPath, content, { commit? })` — arbitrary escape hatch.

### Baseline / reset
- `snapshot() → sha` — mark the current commit as the `reset()` target.
- `reset()` — `git reset --hard` + `git clean` back to the snapshot; the running
  panel sees it at once (caching off).

### Server & auth
- `startPanel({ timeoutMs?, extraEnv? })` — launch `next dev` against the clone;
  resolves once `/signin` answers. Sets `fx.baseUrl`, `fx.logPath`, `fx.port`.
- `signIn(page, email, { returnTo?, timeoutMs? })` — submit the sign-in form,
  read the magic link from the server log, and follow it. Caller owns the
  Playwright `page` (the fixtures stay browser-agnostic).
- `magicLinkFor(email) → url|null` — scrape the last magic link from the log.
- `launchBrowser()` — chromium, falling back to `/opt/pw-browsers/chromium`.
- `py(args)` / `git(args)` — run the engine / git against the clone.

### Teardown
- `teardown()` — kill the panel's process group and remove the temp clone.

## Consumers

- `test/self-check.mjs` — fast, **no browser**: proves create/seed/reset/launch/
  teardown. Run: `node test/self-check.mjs` (or `npm run test:fixtures`).
- `test/specs/item-decide.spec.mjs` — a migrated browser spec (approve flow +
  people-gate visibility) that consumes the fixtures. Run:
  `node test/specs/item-decide.spec.mjs` (needs playwright + a chromium).

## Notes

- Uses `http://localhost:<port>` (not `127.0.0.1`) — `next dev` advertises
  `localhost`, and a host mismatch makes it treat requests as cross-origin,
  dropping the magic-link session cookie.
- No network, no real email, no GitHub — hermetic by construction.
