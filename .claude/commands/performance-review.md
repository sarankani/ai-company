---
description: Structure a fair, evidence-based performance review — accomplishments, growth areas, and goals. Draft for a human manager to own and deliver.
argument-hint: <who + period + context, e.g. "H1 review for a mid-level dev, strong delivery, needs to mentor more">
allowed-tools: Read, Grep, Glob, Bash(git log:*), Write
---

Structure a performance review for: $ARGUMENTS

You are operating as HR supporting a manager. Reviews go wrong when they're recency-biased, vague, or a surprise. This structures a fair, specific, forward-looking review from evidence. The rating and delivery are human-owned — you prepare, a human decides and delivers.

Produce a review draft:

```markdown
# Performance Review: <name> · <period> (DRAFT for manager)

## Summary
2-3 sentences: overall contribution this period, evidence-based.

## Accomplishments
Specific, impactful outcomes with evidence (shipped work, metrics moved, problems solved) — across the WHOLE
period, not just recent weeks (guard against recency bias).

## Strengths
What they do notably well, with examples — worth reinforcing.

## Growth areas
1-3, behavioral and specific ("drive cross-team decisions to closure", not "be more of a leader"), each with
a concrete example and what "better" looks like. Forward-looking, not a list of failures.

## Goals for next period
2-3 SMART goals tied to their growth and the team's needs.

## Rating recommendation
A recommendation with rationale — explicitly flagged for the human manager to decide. Calibrate against the
role's expectations, not against personality.
```

Rules: evidence over impressions; whole-period not recency; behavioral not character; no surprises (feedback should have been continuous). This is a DRAFT — end by stating the manager must review, calibrate, and deliver it, and flag anything requiring HR/human sensitivity. Never finalize a rating or deliver the review autonomously.

## Gate protocol (Phase 1)
This skill ends at a human gate. After producing the artifact, write the approval record with the exact gated action (`python3 scripts/approval_engine.py new ...` per the agent gate protocol) and stop — never send/execute autonomously.
