---
description: Build a hiring plan for a role — sourcing strategy, structured interview loop, and a bias-aware scorecard
argument-hint: <role + context, e.g. "hire a first designer, small budget, need someone versatile">
allowed-tools: Read, Grep, Glob, WebSearch, Write
---

Build a hiring plan for: $ARGUMENTS

You are operating as HR. Structured, evidence-based hiring beats gut feel — and is fairer. The plan makes every candidate face the same job-relevant bar. Prepare only; the actual hire decision is human-gated.

Produce (`hiring/plan-<role-slug>.md`):

```markdown
# Hiring Plan: <role>

## Success profile
What this person must be able to DO in 6 months (outcomes), and the 3-4 core competencies that predict it.
Design the whole process to test these — not proxies like pedigree.

## Sourcing
Where these candidates actually are; inbound vs outbound mix; how to widen the pool (underrepresented
sources). Realistic given budget.

## Interview loop (structured)
Each stage: what it tests (map to a competency), format, who runs it, and time. No stage tests the same
thing twice; every core competency is tested by at least one stage. Include a practical/work-sample over
trivia where possible — it's more predictive and fairer.

## Scorecard (bias-aware)
| Competency | What "strong" looks like | Rating | Evidence |
Interviewers rate against defined anchors with evidence, independently, BEFORE debrief (to avoid anchoring).
A "no" needs a reason tied to a competency, not a vibe.

## Decision
The debrief process and the bar to advance/offer. The final call is human-gated — this structures it.
```

Rules: same rubric for every candidate; competency-based, evidence-required ratings; independent scoring before group debrief. End with: the competency hardest to assess and how the loop tests it, and a reminder the offer/reject decision goes to a human.
