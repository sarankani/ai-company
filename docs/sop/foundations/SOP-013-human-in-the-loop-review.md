# SOP-013 — Human-in-the-Loop (HITL) Review: the 30% rule

| | |
|---|---|
| **Applies to** | All AI employees' output streams and every AI system Evalyn ships that automates a human workflow |
| **Owner** | `ceo` (content) · Founder/CEO approval |
| **Status** | Active |
| **Version** | 1.0 (2026-07-15) |

## 1. Purpose & scope

**Purpose:** codify the **30% rule** — AI handles up to ~70% of highly repetitive throughput; humans retain at least ~30% of the loop for critical quality control, edge-case mitigation, and final approval. The rule exists because unreviewed AI output degrades silently: errors compound, drift goes unnoticed, and trust is spent invisibly until it fails visibly. The 30% is not idle oversight — it is the highest-leverage part of the work: judging, sampling, catching the edge case, and owning the outcome.

**Scope:** two surfaces — (a) **internal:** how Evalyn's own AI employees' output is quality-controlled beyond the hard gates; (b) **delivered:** how HITL review is designed into every automation Evalyn ships to a client. This SOP complements [SOP-003](SOP-003-human-approval-gates.md): gates are the *mandatory 100%-human decision points*; HITL review covers the *between-gates output volume*.

## 2. Roles & responsibilities (RACI)

| Activity | R | A | C | I |
|---|---|---|---|---|
| Set per-stream review ratios & sampling rules (internal) | department Head (human) | Founder/CEO | `eng-manager`, stream-owning AI role | all |
| Perform sample reviews | human seat-holders (or a designated independent AI role for first-pass, human for verdicts) | department Approver | — | stream owner |
| Track review findings & drift signals | `data-analyst` | `eng-manager` | `tester` | department Head |
| Design HITL into a client automation | `solutions-architect` + `product-manager` | `delivery-manager` | client, `security` | `sales` |
| Approve reducing any review ratio | Human — department Head | Founder/CEO | `data-analyst` (evidence) | all |

## 3. Step-by-step procedure

### 3a. Internal — reviewing the AI workforce's output

1. **Classify each recurring output stream** by risk: **gated** (external sends, money, commitments — already 100% human per SOP-003) · **high-consequence non-gated** (specs, estimates, review verdicts, triage decisions) · **repetitive low-consequence** (calendars, drafts, internal summaries).
2. **Apply the default review ratios:** gated = 100% human decision (never sampled). High-consequence = 100% human-*seen* before downstream use (skim + judgment, spot-verify numbers). Repetitive = **sample ≥10%**, minimum 1 per batch, biased toward: new stream, recent change in the producing role's SOP/prompt, or past findings.
3. **Review against the artifact's definition-of-done** (SOP-006), not taste: correct, grounded, TBDs honest, conventions matched. Log each finding on the task/record.
4. **Feed findings back:** defects found in sampling → the producing role reworks (SOP-005 rejected-flow) *and* the pattern goes into that role's SOP anti-patterns or the eval set. A finding that changes procedure is banked (SOP-010).
5. **Adjust ratios on evidence:** a stream with sustained clean samples may reduce toward the 10% floor; any escaped defect doubles the stream's ratio until clean again. Ratio reductions are a Head-level human decision, never the stream owner's.

### 3b. Delivered — designing HITL into client automations

1. **Partition the workflow** in the solution design: which steps are repetitive-automatable (target ≤70%) vs judgment/edge/final-approval (human-retained ≥30% — measured by decision weight, not step count).
2. **Design the review surface:** queue, confidence thresholds routing low-confidence items to humans, sampling of high-confidence items, and an override path — the human must be able to correct the AI cheaply, and corrections must be logged as training/eval signal.
3. **State the ratio in the SOW** — the automation boundary is a scope commitment (`commitments`-gated); never sell "fully autonomous" for consequential decisions (honesty bar, SOP-008).
4. **Verify at UAT:** the client's humans actually exercise the review loop before acceptance; an unused HITL surface is a defect.

## 4. Exceptions & red flags

- **Red flag — anomalous output detected** (hallucinated fact, wrong customer, off-policy tone, repeated identical outputs): freeze the stream's autonomous use, route 100% to review until root-caused; if anything anomalous already went external or into a decision → SOP-009 incident.
- **Red flag — review theater:** samples approved faster than they could be read, or findings rate at 0 for months on a complex stream → the review is rubber-stamping; department Head intervenes (same failure as human-seats SOP-R00 §3).
- **Exception path:** temporarily raising automation above 70% for a burst (e.g. backlog clearance) requires the Head's explicit time-boxed approval and doubled post-hoc sampling of the burst output.
- **No-exception:** the gates. No throughput argument ever converts a gated decision into a sampled one (ADR-0004 territory).

## 5. KPIs & metrics

- **Review coverage:** actual sample rate vs the stream's set ratio — target 100% of ratio met, per stream, monthly.
- **Defect find rate in samples** — healthy is low-but-nonzero; 0 across everything signals theater, spikes signal producer drift.
- **Escaped-defect rate:** defects found downstream/externally that sampling missed — target 0; each triggers the ratio-doubling rule.
- **Human decision latency** on HITL queues (internal and delivered) — within gate SLAs (SOP-004); a growing queue means the ratio or staffing is wrong, escalate to the Head.
- **Automation share per delivered workflow** — stays within the SOW's committed boundary; measured at QBR.

## 6. References

[SOP-003](SOP-003-human-approval-gates.md) gates vs review · [SOP-004](SOP-004-escalation-and-slas.md) SLAs · [SOP-006](SOP-006-handoffs-and-communication.md) DoD · [SOP-008](SOP-008-quality-evidence-and-honesty.md) · [SOP-009](SOP-009-incident-management.md) · human seats SOP-R00 · roles: all.

---
*Changelog: 1.0 — initial.*
