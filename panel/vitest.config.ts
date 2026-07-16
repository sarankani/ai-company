import { defineConfig } from "vitest/config";

/**
 * EX-604 — unit tests for the panel's pure TS logic (lib/*), kept in lockstep
 * with the Python engine (tests/test_approval_engine.py) via parity tests.
 *
 * Scope: the pure, framework-free logic. The IO surfaces (write.ts, the
 * GitHub/Local sources in records.ts, loadHumans/loadRecords in org.ts) are
 * exercised by the Playwright e2e suite (EX-602/603), not here — so coverage is
 * measured over the pure libs the unit suite actually owns.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/unit/**/*.test.ts"],
    // auth.ts requires a signing secret; a fixed test value keeps tokens stable.
    env: { SESSION_SECRET: "vitest-fixed-secret-not-a-real-key" },
    coverage: {
      provider: "v8",
      include: [
        "lib/engine.ts",
        "lib/auth.ts",
        "lib/audit.ts",
        "lib/stats.ts",
        "lib/format.ts",
      ],
      reporter: ["text-summary", "json-summary", "html"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 75 },
    },
  },
});
