# EX-606 — Regression proof: CI catches a deliberately-introduced defect

The Phase-6 exit criterion (Plan 004) is that a real regression is **caught by
CI, proven — not assumed**. This runbook records that proof and how to
reproduce it. It's the evidence behind making the panel checks **required**
(`docs/runbooks/panel-required-checks.md`).

## The defect

A one-line change to `panel/lib/engine.ts` `decide()` — the core approval
transition — so an approved record never actually flips to `approved`:

```diff
   if (done) {
-    data.state = inp.outcome;
+    // data.state = inp.outcome;   // deliberate regression
     data.decision = { ...stamp };
```

This is exactly the class of bug the suite exists to stop: "approve" looks like
it worked in the UI, but the record is never actually decided.

## What CI catches (both layers, verified 2026-07-16 on a scratch checkout)

### Unit suite (`Panel unit tests (Vitest)` job → `npm run test:unit:cov`)

```
❯ test/unit/engine.test.ts (39 tests | 6 failed)
  × single-approves a merge-deploy record in one stamp
  × dual people gate at n=1: the ceo (both seats) still needs two stamps
  × dual people gate needs distinct stampers once two are qualified
  × claims then completes exactly once
  × refuses a second claim and a second complete
  × blocks execution when the artifact changed after approval
 Tests  6 failed | 33 passed (39)
```

### E2E suite (`Panel E2E (Playwright)` job → `npm run test:e2e`)

```
test/specs/item-decide.spec.ts › approve writes one stamped commit + registry…
  Error: expect(received).toContain(expected)
  > 82 |   expect(stat).toContain("registry.md");
    85 |   expect(rec).toContain("state: approved");
  1 failed
```

Either failing job **blocks the merge** once the checks are required, and the
Playwright job uploads its HTML report + traces as a PR artifact for debugging.

## Reproduce it

```bash
cd panel
# introduce the defect (comment out `data.state = inp.outcome;` in lib/engine.ts)
npm run test:unit         # → red (6 failures)
npm run test:e2e          # → red (approve flow)
git checkout lib/engine.ts   # revert — never commit the defect
```

The defect is **never committed** — it is introduced on a throwaway working
copy, observed to fail, and reverted. This document is the durable artifact.

## The full gate (EX-606)

| Signal | Enforced by | Status |
|---|---|---|
| Build / type-check | `Type-check & build` job | ✅ live |
| Unit + **coverage threshold** | `vitest.config.ts` thresholds, `Panel unit tests` job | ✅ live |
| E2E + **a11y** | `Panel E2E (Playwright)` job | ✅ live |
| Dependency + secret scan | `Dependency audit` / `Secret scan` jobs | ✅ live |
| A **quality summary** per run | job-summary steps in `panel-ci.yml` | ✅ live |
| Regression **caught by CI** | this proof | ✅ proven |
| Checks are **required** to merge | branch protection (`panel-required-checks.md`) | ⏳ **Founder applies** |

Once the Founder turns on the required-checks branch-protection rule, Phase 6's
definition of done is met and the phase can be recorded complete.
