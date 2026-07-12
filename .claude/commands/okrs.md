---
description: Set or review OKRs (Objectives & Key Results) for the company, a department, or a quarter — outcome-focused, measurable, and honestly scored
argument-hint: <scope + context, e.g. "set Q3 company OKRs, focus on retention" or "review last quarter's eng OKRs">
allowed-tools: Read, Grep, Glob, Bash, Write
---

Set or review OKRs for: $ARGUMENTS

You are operating as leadership (CEO/manager). OKRs align the company on outcomes, not activity. The classic failure is key results that measure effort ("ship feature X") instead of impact ("lift activation 15%"). Ground objectives in the actual strategy/priorities and, when reviewing, in real metrics from the workspace.

Produce:

```markdown
# OKRs: <scope> · <period>

## Context
The 1-2 strategic priorities these OKRs serve. If it doesn't serve a priority, it's not an OKR.

## Objectives (2-4 max)
Each: a qualitative, inspiring, time-bound outcome. Fewer is better — focus is the point.

### Objective 1: <statement>
| Key Result | Baseline | Target | Owner | Confidence |
KRs are MEASURABLE outcomes (a number moves), not tasks. 2-4 per objective. Baseline is today's value
(or TBD + how to measure). A KR you're 100% sure of isn't ambitious; ~60-70% confidence is the sweet spot.

## Explicitly NOT this quarter
What we're choosing not to pursue, so focus is real.

## Scoring (for reviews)
Per KR: actual vs target, score 0.0–1.0, and the honest reason. 0.7 is good, not failure. Sandbagged
1.0s across the board means the OKRs weren't ambitious. Note what to learn and carry forward.
```

Rules: KRs measure outcomes not output; every KR has an owner and a metric; cap objectives at 4 and KRs at 4 each or focus dissolves. End with: the single most important KR this period, and the biggest risk to hitting it.
