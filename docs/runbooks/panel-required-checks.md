# Runbook — make panel CI checks required (branch protection)

The panel CI workflow (`.github/workflows/panel-ci.yml`) runs, on every change
under `panel/**`:

| Check | Job name | Gate |
|---|---|---|
| Type-check & build | `Type-check & build` | build must pass |
| **Panel E2E (Playwright)** | `Panel E2E (Playwright)` | e2e suite must pass (EX-603) |
| Dependency audit | `Dependency audit` | no high/critical advisories |
| Secret scan | `Secret scan` | no leaked secrets |

Running the jobs is automatic. **Blocking a merge on them is a repository
setting only a human with admin rights can apply** (GitHub doesn't let a
workflow make itself required). This runbook is that step.

## Make the checks required (Founder, one-time)

1. GitHub → the repo → **Settings → Branches → Branch protection rules**.
2. Add/edit the rule for **`main`**.
3. Enable **"Require status checks to pass before merging"**.
4. In the search box add these checks by their job names:
   - `Type-check & build`
   - `Panel E2E (Playwright)`
   - `Dependency audit`
   - `Secret scan`
5. (Recommended) Enable **"Require branches to be up to date before merging"**.
6. Save.

After this, a panel PR cannot be merged until all four are green. A failing
e2e run attaches the Playwright HTML report + traces as a PR artifact
(`playwright-report`) for debugging.

## Notes

- The e2e job installs chromium in CI (`npx playwright install --with-deps
  chromium`, cached by Playwright version). Locally it reuses the pinned
  `/opt/pw-browsers` browser; see `panel/test/README.md`.
- Runtime: the suite runs single-worker for determinism. If PR latency grows,
  shard across workers (`--shard`) in a matrix — noted for a future pass.
- The end-to-end **regression proof** (introduce a real defect, watch CI go
  red) and the aggregate coverage gate are **EX-606**.
