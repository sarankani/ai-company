# Plan 004 — Phase 6: Panel Test Automation & Quality

- **Status:** Draft — proposed 2026-07-15 (Founder requested panel automation testing)
- **Epic:** E6 — Panel Test Automation & Quality
- **Owner:** tester (lead) + developer + devops · Saran (gates)
- **Related:** `panel/` · `panel/e2e/smoke.mjs` · `.github/workflows/panel-ci.yml` · Tech Spec 001 §8 · Design Brief 001 (a11y)
- **Numbering:** "Phase 6" is a **parallel quality track**, not sequential after the reserved Phases 4 (dedicated backend) and 5 (authoring skills). It has no dependency on them and can run now.

## 1. Why

The panel is live and dogfooding itself, but its correctness rests on a **hand-rolled e2e script** (`panel/e2e/smoke.mjs`, ~70 checks) that a human runs manually against a throwaway clone. There is **no automated gate**: a panel PR can merge without the e2e suite ever running, the TypeScript libs (`engine.ts`, `auth.ts`, `records.ts`, `audit.ts`, `stats.ts`) have **no unit tests** (only indirect e2e coverage), and there are **no accessibility checks** despite the design brief's a11y commitments. As the panel grows, "it worked when I ran the script" will not hold. This phase makes panel quality **automatic and enforced on every change**.

The Python engine already has 31 unit tests in CI (`approval-records-ci.yml`); this phase brings the TypeScript side to parity and puts the browser suite in front of every merge.

## 2. Goal & definition of done

Every panel change is automatically verified before merge by: a real-browser e2e suite (Playwright) running in CI, unit tests over the TS libs, and accessibility assertions — all behind a required status check, with failure artifacts (traces, screenshots, reports) attached to the PR. No manual smoke run required.

**Phase exit:** EX-601…606 merged; the panel-e2e + panel-unit + a11y checks are required on panel PRs; a deliberately-introduced regression is caught by CI (proven, not assumed).

## 3. Task board

States: `todo` · `in-progress` · `blocked` · `waiting-on-gate` · `in-review` · `done`.

| ID | Task | Owner | Gate | Blocked by | Blocks |
|---|---|---|---|---|---|
| EX-601 | Test fixtures & deterministic seeding harness | tester + developer | merge via loop | — | EX-602, EX-604 |
| EX-602 | Migrate `smoke.mjs` → `@playwright/test` project | tester + developer | merge via loop | EX-601 | EX-603, EX-605 |
| EX-603 | Wire panel E2E into CI (headless, artifacts) | devops | merge via loop | EX-602 | EX-606 |
| EX-604 | Unit tests for the TS libs (Vitest, engine parity) | developer | merge via loop | EX-601 | EX-606 |
| EX-605 | Accessibility checks (axe-core in Playwright) | tester | merge via loop | EX-602 | EX-606 |
| EX-606 | Coverage gate + quality report (required check) | devops + tester | Saran accepts | EX-603, EX-604, EX-605 | phase exit |

**Every EX-6xx merge goes through the Phase-1 approval loop** (same dogfooding rule as Phase 2/3).

## 4. Detailed task entries

Template: **US** user story · **PS** problem statement · **UC** use cases · **AC** acceptance criteria · **IM** implementation · **OS** out of scope · **TN** technical notes · **TS** tests · **DoD** definition of done · **RD** related documents.

### EX-601 — Test fixtures & deterministic seeding harness
- **US:** As a test author, I want a one-call way to spin an isolated company-repo fixture and seed exact records/humans, so tests are deterministic and cheap to write.
- **PS:** Today each e2e run manually clones the repo, seeds via `approval_engine.py`, and relies on `CACHE_TTL_MS=0` — ad hoc and duplicated. New tests are expensive and flaky (the warm-cache incident).
- **UC:** create a throwaway clone → seed N approval/question records + custom humans/departments → start the panel against it with caching off → reset between tests · tear down cleanly.
- **AC:** a reusable helper (create/seed/reset/teardown) with no shared state between tests; seeding covers records, humans (incl. `slack_id`), departments; documented; used by at least one migrated spec.
- **IM:** a `panel/test/fixtures/` module (clone to a temp dir, `approval_engine.py new`/write helpers, dev-server launcher with `CACHE_TTL_MS=0` + ephemeral `SESSION_SECRET`), plus a fixtures README.
- **OS:** the actual test migration (EX-602); CI wiring (EX-603).
- **TN:** owner `tester`+`developer`. Never touches the real `company/` tree — temp dirs only.
- **TS:** a self-check that fixtures create/seed/reset correctly.
- **DoD:** merged; one spec consumes it.
- **RD:** current `panel/e2e/smoke.mjs` (clone/seed pattern) · `scripts/approval_engine.py`.

### EX-602 — Migrate `smoke.mjs` → `@playwright/test` project
- **US:** As the team, I want the e2e checks as a real Playwright test project so failures give traces/retries/reports instead of a bespoke pass/fail log.
- **PS:** `smoke.mjs` is one long script with a custom `ok()` harness — no isolation, no retries, no trace on failure, hard to target one area.
- **UC:** run one spec (`item-decide.spec`) locally · a failure produces a trace + screenshot · specs grouped by area (auth, inbox, item, dashboard, board, admin, audit, availability, security-regressions).
- **AC:** `playwright.config.ts` (chromium, retries, trace on first-retry, HTML reporter); `smoke.mjs`'s coverage preserved 1:1 across spec files using EX-601 fixtures; `npx playwright test` green locally; old script removed or thin-wrapped.
- **IM:** add `@playwright/test`; port each `ok()` group to `expect` assertions in area spec files; web-server launch via config or fixtures.
- **OS:** CI wiring (EX-603); a11y (EX-605); visual regression (future).
- **TN:** owner `tester`+`developer`. Reuse the existing chromium at `/opt/pw-browsers` in CI.
- **TS:** the suite itself; parity checked against the retired smoke checks.
- **DoD:** merged; `smoke.mjs` coverage fully represented as specs.
- **RD:** `panel/e2e/smoke.mjs` · Tech Spec 001 §8.
- **Blocked by:** EX-601.

### EX-603 — Wire panel E2E into CI
- **US:** As a reviewer, I want the browser suite to run automatically on panel PRs so no UI regression can merge unseen.
- **PS:** `panel-ci.yml` runs build + audit + secret-scan but **not** the e2e suite; the panel's actual behavior is unverified at merge time.
- **UC:** open a panel PR → Playwright runs headless against a fresh fixture → pass gates the merge · failure uploads the HTML report + traces as artifacts · browser install cached.
- **AC:** a CI job (in `panel-ci.yml` or a new workflow) installs deps + chromium, runs the Playwright suite headless, uploads report/traces on failure, and is a **required** check; runtime kept reasonable (shard if needed).
- **IM:** GitHub Actions job using the migrated project; `actions/upload-artifact` for `playwright-report/`; browser caching.
- **OS:** unit tests (EX-604); coverage gate (EX-606).
- **TN:** owner `devops`. Deterministic via EX-601 fixtures (no network, caching off).
- **TS:** a PR that breaks a flow must fail this job (verified in EX-606's regression proof).
- **DoD:** merged; required on panel PRs.
- **RD:** `.github/workflows/panel-ci.yml`.
- **Blocked by:** EX-602.

### EX-604 — Unit tests for the TS libs
- **US:** As a developer, I want fast unit tests over the panel's pure logic so I catch engine/parser/auth bugs without a browser.
- **PS:** `engine.ts` (decide, dual-approval, createRecord, SLA math, skipUnavailableAssignee, dump roundtrip), `auth.ts` (token pack/unpack, `safeReturnTo`, `panelBaseUrl`), `records.ts` (parser, `safeRepoPath`), `audit.ts`, `stats.ts` have **zero** direct tests — regressions only surface (if at all) via e2e.
- **UC:** run `vitest` in seconds · a broken dual-approval rule fails a unit test · TS↔Python engine parity asserted on shared fixtures (same record decided identically).
- **AC:** unit tests for each lib's public functions incl. edge cases from the security review (path traversal, open redirect, dual-control distinctness); **parity tests** vs `approval_engine.py` outputs on shared fixtures; runs in CI; ≥80% line coverage on `lib/`.
- **IM:** add Vitest; `lib/*.test.ts`; a small parity harness that runs both engines on the same input and diffs.
- **OS:** component/render tests of pages (covered by e2e); coverage-gate wiring (EX-606).
- **TN:** owner `developer`. Keep lockstep with the Python suite — a rule change touches both.
- **TS:** the unit suite itself.
- **DoD:** merged; runs in CI; coverage met.
- **RD:** `panel/lib/*` · `tests/test_approval_engine.py`.
- **Blocked by:** EX-601 (shares fixtures/helpers).

### EX-605 — Accessibility checks
- **US:** As any human — including those using assistive tech — I want the panel to meet its a11y commitments, enforced automatically.
- **PS:** The design brief commits to keyboard paths, focus rings, and contrast, but nothing verifies them; regressions are invisible.
- **UC:** each key screen is scanned with axe-core → zero critical/serious violations · keyboard-only path through sign-in → decide works · focus never trapped/suppressed.
- **AC:** axe-core integrated into the Playwright suite on signin/inbox/item/dashboard/board/admin/audit; no critical/serious violations; a keyboard-navigation happy-path test; runs in CI.
- **IM:** `@axe-core/playwright`; per-screen scans; a keyboard-only decide test.
- **OS:** full WCAG audit / screen-reader manual testing (future); color-contrast design changes beyond fixing violations found.
- **TN:** owner `tester`. Design Brief §a11y is the spec.
- **TS:** the a11y assertions themselves.
- **DoD:** merged; a11y checks run on panel PRs.
- **RD:** `docs/specs/design-brief-001-control-panel.md`.
- **Blocked by:** EX-602.

### EX-606 — Coverage gate + quality report
- **US:** As the Founder, I want one green "panel quality" signal on every PR so I can trust a merge without reading test logs.
- **PS:** Even with e2e + unit + a11y, without a required aggregate gate a red suite can still be merged past.
- **UC:** a PR with any failing panel test cannot merge · coverage below threshold fails · a short quality summary (tests passed, coverage, a11y) is posted/visible · a deliberately-broken flow is caught end to end.
- **AC:** unit + e2e + a11y are **required** checks on panel PRs; coverage threshold enforced; a **regression proof** — introduce a real defect on a scratch branch and show CI red — is documented; Founder accepts.
- **IM:** branch-protection required checks (documented; Founder applies) + a coverage threshold in the unit config + a summary step (job summary / PR comment).
- **OS:** flaky-test quarantine tooling; performance/load testing (future phase).
- **TN:** owner `devops`+`tester`. Required-check config is a repo setting (Founder applies; documented in the runbook).
- **TS:** the regression-proof run is the test.
- **DoD:** merged; checks required; regression proof recorded; **Phase 6 exit.**
- **RD:** this plan · `.github/workflows/panel-ci.yml`.
- **Blocked by:** EX-603, EX-604, EX-605.

## 5. Out of scope (this phase)
- Visual-regression / screenshot-diff testing (candidate for a follow-up).
- Load / performance / soak testing.
- Mutation testing.
- Testing the Python engine (already covered by `approval-records-ci.yml`).

## 6. Risks
| Risk | Mitigation |
|---|---|
| Playwright in CI is flaky | EX-601 deterministic fixtures (caching off, isolated clone); retries + traces |
| E2E runtime bloats PR latency | Shard specs; run unit + a11y fast-fail first |
| TS/Python engine drift | EX-604 parity tests fail on divergence |
