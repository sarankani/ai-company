import { defineConfig } from "@playwright/test";
import { existsSync } from "fs";

// Reuse the pre-installed chromium when present (CI pins it at /opt/pw-browsers,
// which may be a different revision than @playwright/test bundles). On a dev
// machine this path won't exist, so Playwright uses the browser installed via
// `npx playwright install chromium`. Override with PLAYWRIGHT_CHROMIUM_PATH.
const PINNED = "/opt/pw-browsers/chromium";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync(PINNED) ? PINNED : undefined);

/**
 * EX-602 — panel e2e as a real Playwright project (replaces panel/e2e/smoke.mjs).
 *
 * Each worker gets its own isolated panel via the EX-601 fixtures
 * (test/fixtures/playwright.ts): a throwaway repo clone + a `next dev` server
 * with caching off, reset between tests. So there is NO global `webServer` and
 * NO `baseURL` here — specs drive `fx.baseUrl` (a fresh ephemeral port).
 *
 * Browser: resolved via PLAYWRIGHT_BROWSERS_PATH (pinned to /opt/pw-browsers in
 * CI) — no per-run download. Locally, `npx playwright install chromium` once.
 */
export default defineConfig({
  testDir: "./test/specs",
  testMatch: "**/*.spec.ts",
  // Specs mutate a shared per-worker git clone, so tests within a worker run
  // serially; keep it deterministic. EX-603 can shard across workers later.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    browserName: "chromium",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
});
