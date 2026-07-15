# SOP-014 — Model Deployment & Rollback: ship measured, roll back fast

| | |
|---|---|
| **Applies to** | Deploying or updating any model, fine-tune, prompt/agent configuration, or AI pipeline to a live environment — Evalyn's own or a client's |
| **Owner** | `devops` (content) · Engineering Head approval |
| **Status** | Active |
| **Version** | 1.0 (2026-07-15) |

## 1. Purpose & scope

**Purpose:** make AI deployments boring — every model change reaches production through the same CI/CD path, behind the same benchmarks, with a rehearsed rollback that executes in minutes when a live model degrades, drifts, or hallucinates. A model without a rollback path is not deployable.

**Scope:** model weights, fine-tunes, prompt/system-prompt changes, agent configurations, retrieval indexes, and inference infra — anything that changes live AI behavior. Prompt changes are deployments: they alter behavior exactly like weight changes and get the same pipeline. Out of scope: ordinary application code (normal `merge-deploy` flow per the engineering SOPs), though the gate is the same.

## 2. Roles & responsibilities (RACI)

| Activity | R | A | C | I |
|---|---|---|---|---|
| Build/maintain the CI/CD pipeline & benchmark harness | `devops` + `developer` | `eng-manager` | `tester` | — |
| Define benchmark suites & thresholds per system | `tester` + `data-analyst` | `tester` | `product-manager`, `security` | `delivery-manager` |
| Prepare the deploy request (evidence + rollback plan) | `devops` | `devops` | `developer` | `eng-manager` |
| **Approve deploy / manual rollback** | **Human — Engineering Approver** | Engineering Head | — | client (per contract) |
| Execute deploy, canary watch, rollback | `devops` | `eng-manager` | `data-analyst` (monitoring) | all |
| Post-rollback incident & postmortem | `devops` (lead per SOP-009) | `eng-manager` | `security`, `tester` | Founder/CEO |

## 3. Step-by-step procedure

### 3a. CI/CD triggers & pre-deploy benchmarks

1. **Trigger:** any merge touching model artifacts, prompts, agent config, or index build runs the full eval pipeline automatically — no manual "it's a small prompt tweak" bypass.
2. **Benchmarks (all must pass before a deploy request exists):** task-quality evals vs the current production baseline (no regression beyond agreed tolerance) · safety/hallucination suite (groundedness on known-answer sets, refusal correctness) · fairness report current per [SOP-012](SOP-012-model-bias-and-fairness-testing.md) · latency/cost within budget · data-privacy check on any new training/index data per [SOP-011](SOP-011-data-ingestion-and-privacy.md).
3. **Version everything together:** model/prompt/index/config versions pinned as one release id; the previous known-good release id is recorded as the rollback target.
4. **Deploy request:** `devops` files the `merge-deploy` gate per [SOP-003](SOP-003-human-approval-gates.md) — exact action (release id → environment), benchmark evidence attached, and the **rollback plan**: trigger conditions, target release id, execution command, verification step. **The approval covers the deploy *and* its stated auto-rollback conditions** — rolling back to the pinned known-good under those conditions is pre-approved by this same stamp.

### 3b. Deploy & watch

5. **Stage → canary → full:** deploy behind a flag/canary slice where the system supports it; hold at canary for the watch window defined in the deploy request.
6. **Monitor (automated, from the moment of deploy):** error/refusal rates, eval-sampled output quality, hallucination signals (grounding-check failures, contradiction flags, user corrections), latency/cost, and HITL-queue findings per [SOP-013](SOP-013-human-in-the-loop-review.md). Thresholds and windows come from the deploy request, not improvisation.

### 3c. Emergency rollback (a live model degrades or hallucinates)

7. **Any threshold breach or credible degradation report →** execute the pre-approved rollback **immediately**: revert to the pinned known-good release, verify with the smoke eval, confirm live signals recover. Roll back first, diagnose second — the known-good is always the safer state.
8. **Declare the incident** per [SOP-009](SOP-009-incident-management.md) (P0 if customer-visible): timeline, impact, comms drafts staged.
9. **Re-entry:** the fixed release goes back through the full pipeline from step 1 — a post-incident redeploy never skips benchmarks. Rollback beyond the pre-approved conditions (different target, data migration involved, prod-data surgery) is a fresh `merge-deploy` gate at P0.
10. **Postmortem** within 3 business days (SOP-009 §3), including: which benchmark or monitor should have caught it, and the eval-suite fix as a tracked task.

## 4. Exceptions & red flags

- **Red flag — silent drift:** live quality sinking without a deploy (data drift, upstream model/API change) → treat as step 7; drift response is rollback-or-mitigate + re-benchmark, never "watch it another week."
- **Red flag — benchmark gaming:** evals passing while HITL sampling (SOP-013) finds defects → the suite is stale; block further deploys of that system until `tester` closes the gap.
- **Exception path — emergency forward-fix:** when rollback is impossible (schema/index already migrated), the forward-fix is a P0 `merge-deploy` gate with the human on the loop at the 2h/hourly cadence — urgency raises priority, never autonomy (SOP-009 §4).
- **No-exception:** deploying with a failing or skipped benchmark, deploying without a pinned rollback target, or "temporary" unversioned prompt edits in production.

## 5. KPIs & metrics

- **Rollback execution time:** breach detected → known-good verified live — target < 15 minutes, rehearsed quarterly (a drill counts only if executed end-to-end).
- **Deploy pass rate:** % of releases passing benchmarks first attempt — trend per system.
- **Escaped degradations:** production incidents the benchmark suite should have caught — target 0; each one mandates a suite fix (step 10).
- **Benchmark coverage & currency:** every live AI system has a suite run against its current version — target 100%.
- **Change lead time:** merge → production for passing releases — trend; the gates are the intended constraint, the pipeline should never be.

## 6. References

[SOP-003](SOP-003-human-approval-gates.md) merge-deploy gate · [SOP-009](SOP-009-incident-management.md) incidents/postmortems · [SOP-011](SOP-011-data-ingestion-and-privacy.md) · [SOP-012](SOP-012-model-bias-and-fairness-testing.md) · [SOP-013](SOP-013-human-in-the-loop-review.md) · role SOPs: devops (R12), tester (R11), developer (R09) · runbooks `docs/runbooks/`.

---
*Changelog: 1.0 — initial.*
