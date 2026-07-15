/**
 * RETIRED (EX-602). The hand-rolled smoke suite was migrated to a real
 * @playwright/test project driven by the EX-601 fixtures. Its ~70 checks now
 * live 1:1 under panel/test/specs/*.spec.ts.
 *
 *   npm run test:e2e        # runs `playwright test`
 *   npm run test:fixtures   # fixtures self-check (no browser)
 */
console.error(
  "panel/e2e/smoke.mjs was migrated to @playwright/test (EX-602).\n" +
  "Run `npm run test:e2e` (specs in panel/test/specs/) instead.",
);
process.exit(1);
