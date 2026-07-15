# SOP-012 — Model Bias & Fairness Testing: no model ships on accuracy alone

| | |
|---|---|
| **Applies to** | Any model, fine-tune, prompt-based system, or algorithmic decision logic Evalyn builds or ships — internal or client-facing |
| **Owner** | `tester` + `security` (content) · Engineering Head approval |
| **Status** | Active |
| **Version** | 1.0 (2026-07-15) |

## 1. Purpose & scope

**Purpose:** ensure no AI system Evalyn delivers exhibits unjustified demographic or protected-class disparity in its predictions, rankings, generations, or refusals — measured against defined benchmarks before deployment, not discovered by users after. Aggregate accuracy is not evidence of fairness; a model can be 95% accurate and systematically wrong for one group.

**Scope:** mandatory for any system whose outputs affect people (hiring/screening, scoring, pricing, content moderation, support triage, personalization, generation shown to end users). Applies at: initial delivery, every model/prompt/dataset change that could shift behavior, and periodic re-audit of live systems. Out of scope: pure infrastructure with no human-affecting outputs (document the exemption in the project record — the exemption itself gets reviewed).

## 2. Roles & responsibilities (RACI)

| Activity | R | A | C | I |
|---|---|---|---|---|
| Identify affected groups & fairness criteria for the use case | `product-manager` + `solutions-architect` | `product-manager` | client, `security` | `delivery-manager` |
| Build/select benchmarks & disaggregated eval sets | `tester` + `data-analyst` | `tester` | `security` | — |
| Run the evaluation & compute disparity metrics | `tester` | `tester` | `data-analyst` | `eng-manager` |
| Judge acceptability & remediation | `security` + `eng-manager` | `eng-manager` | `product-manager` | — |
| Sign off fairness gate before deploy | Human — Engineering Approver | Engineering Head | — | client (per contract) |

## 3. Step-by-step procedure (the mandatory checklist)

1. **Define the fairness spec at design time** (not after building): which groups could be differentially affected, which decisions the system influences, which disparity metrics apply (e.g. demographic parity gap, equalized odds, per-group error/refusal rates, representation in generations), and the acceptable thresholds. Thresholds are a client/human decision when the system is client-facing — mark `TBD` and escalate if undefined; never invent them (SOP-008).
2. **Audit the data** (with SOP-011's register): group representation, label source and its historical bias, proxies for protected attributes. Document known skews.
3. **Build disaggregated evals:** the eval set must support per-group measurement across every identified dimension, plus intersectional slices where the use case warrants. Synthetic augmentation is allowed and flagged as such.
4. **Run and compute** — every metric per group, with confidence intervals where sample sizes are small; small-n groups are reported as *insufficient data*, never silently averaged in.
5. **Adversarially probe:** targeted prompts/cases designed to elicit stereotyped, degraded, or refusing behavior per group (generation systems especially). Log everything found.
6. **Judge:** results within thresholds → record and proceed. Outside → remediate (data rebalancing, prompt/logic change, threshold recalibration, or scope reduction) and **re-run from step 4**. Remediation by "excluding the failing group from the eval" is falsification, not remediation.
7. **File the fairness report** in the project record: spec, data audit, per-group results, probes, remediations, residual risks stated honestly. This report is a required input to the `merge-deploy` gate per [SOP-014](SOP-014-model-deployment-and-rollback.md) — no report, no deploy request.
8. **Schedule re-audit:** on every behavior-shifting change and at minimum quarterly for live human-affecting systems (drift moves fairness too).

## 4. Exceptions & red flags

- **Red flag — disparity found in production** (support tickets, monitoring, client report): treat as a P1 incident minimum (P0 if legally exposed or actively harming users), per SOP-009; the system's fairness report is reopened, mitigation options staged for the human.
- **Red flag — pressure to skip or soften:** deadline or deal pressure to trim the checklist → escalate per [SOP-004](SOP-004-escalation-and-slas.md); the honesty bar (SOP-008) applies — a fairness claim the report can't back never goes in a proposal or deliverable.
- **Exception path:** a client declining fairness testing for their system is a `commitments`-class decision a human makes with the risk stated in writing on the record — and Evalyn's report still documents that testing was declined (protect-the-company principle).
- **No-exception:** hiring/people-affecting systems (including Evalyn's own `/hiring-plan` scorecards) are never exempted — bias-aware design is already their stated standard.

## 5. KPIs & metrics

- **Coverage:** % of in-scope shipped systems with a current fairness report — target 100%.
- **Per-group disparity metrics** vs their thresholds — tracked per system, per release.
- **Production fairness escapes:** disparities found live that testing missed — target 0; each one gets a postmortem and an eval-set fix.
- **Re-audit currency:** live systems past their re-audit date — target 0.
- **Remediation cycle time:** step-6 fail → passing re-run — trend, per system.

## 6. References

[SOP-011](SOP-011-data-ingestion-and-privacy.md) data audit · [SOP-014](SOP-014-model-deployment-and-rollback.md) deploy gate inputs · [SOP-008](SOP-008-quality-evidence-and-honesty.md) honesty bar · [SOP-009](SOP-009-incident-management.md) · roles: `tester`, `data-analyst`, `security`, `product-manager`.

---
*Changelog: 1.0 — initial.*
