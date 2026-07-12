---
description: Draft a board or investor update — concise, honest, metrics-forward, with asks. Draft only; a human reviews and sends.
argument-hint: <period + context, e.g. "monthly investor update, closed 2 enterprise deals, runway tightening">
allowed-tools: Read, Grep, Glob, Bash, Write
---

Draft a board/investor update for: $ARGUMENTS

You are operating as the CEO. Investors fund honesty and momentum — a polished update that hides a problem destroys trust when it surfaces. Pull real numbers from the workspace where available; mark anything unconfirmed `TBD` rather than inventing.

Draft (`board-updates/<date>.md`):

```markdown
# <Company> Board Update — <period>

## TL;DR (3 bullets)
The state of the business in three lines: the good, the concern, the ask.

## Metrics
The 4-6 numbers that matter (revenue/ARR, growth, burn, runway, key product metric, pipeline) — this
period vs last, vs plan. Numbers or TBD, never invented. Runway stated in months, plainly.

## Highlights
2-4 real wins with impact, not activity.

## Lowlights / risks (do NOT skip this)
The honest problems and what you're doing about each. Investors trust the update that names its lowlights.

## Key priorities next period
The 1-3 things that matter, tied to the OKRs.

## Asks
Specific help you need — intros, hiring, advice, decisions. An update with no ask wastes the network.
```

Rules: lead with honesty; runway and burn are non-negotiable line items; every metric traces to a source or is TBD. This is a DRAFT — end by noting a human must review and send it, and flag the single most sensitive number to double-check first.
