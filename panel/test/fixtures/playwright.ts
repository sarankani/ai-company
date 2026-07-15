/**
 * EX-602 — bridge the EX-601 fixtures harness into @playwright/test.
 *
 * Exposes a worker-scoped `fx` fixture: one isolated repo clone + `next dev`
 * server per worker (created once, torn down at worker end), plus an automatic
 * `reset()` after every test so specs never leak state into each other. Specs
 * import { test, expect } from here and drive `fx` (seed records, `fx.baseUrl`,
 * `fx.signIn(page, email)`).
 *
 *   import { test, expect } from "../fixtures/playwright";
 *   test("…", async ({ page, fx }) => { … });
 */
import { test as base, expect } from "@playwright/test";
// index.mjs is plain ESM (JSDoc-typed); Playwright transpiles specs per-file,
// so the runtime import is fine and the type resolves loosely.
// @ts-ignore - no .d.ts for the .mjs harness
import { createFixture } from "./index.mjs";

type Fixture = Awaited<ReturnType<typeof createFixture>>;

export const test = base.extend<{ _reset: void }, { fx: Fixture }>({
  // one isolated clone + panel server per worker
  fx: [
    async ({}, use) => {
      const fx = await createFixture();
      await fx.startPanel();
      await fx.snapshot(); // pristine baseline reset() returns to
      await use(fx);
      await fx.teardown();
    },
    { scope: "worker" },
  ],
  // auto: restore the clone to the pristine baseline after each test
  _reset: [
    async ({ fx }, use) => {
      await use();
      await fx.reset();
    },
    { auto: true },
  ],
});

export { expect };
