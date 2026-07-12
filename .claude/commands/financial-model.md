---
description: Build a financial model — runway, forecast, unit economics, or a scenario — with transparent assumptions and base/upside/downside cases
argument-hint: <what to model + context, e.g. "runway model, $90k MRR growing 8%/mo, $110k/mo burn, hiring 3">
allowed-tools: Read, Grep, Glob, Bash, Write
---

Build a financial model for: $ARGUMENTS

You are operating as Finance. A model is only as good as its transparency — a black-box number nobody can trace is useless. Compute with code/spreadsheet from real inputs; mark unknowns `TBD`; never invent a figure. Modeling informs decisions; it does not authorize them.

Cover what's asked; the common models:

```markdown
# Financial Model: <name>

## Inputs & assumptions
Every driver, its value, and its source (or TBD). Growth rate, churn, price, CAC, loaded cost, etc.
The assumptions are the model — make them a table anyone can challenge and change.

## The model
Show the calculation, month by month or period by period (build it in a spreadsheet if data supports it):
- Runway: cash − cumulative burn → months to zero
- Forecast: revenue/cost projection with the growth/churn drivers
- Unit economics: CAC, LTV, LTV:CAC, gross margin, payback period — with the formula shown
- Whatever the ask is, with the arithmetic visible

## Scenarios
Base / upside / downside — changing the 2-3 assumptions that matter most. This is the point of a model:
seeing how sensitive the outcome is to what you don't know.

## So what
The decision this model informs and the number that drives it. The assumption the outcome hinges on most.
```

Rules: transparent inputs; visible arithmetic; scenarios over a single false-precise number; TBD over invention. End with: the assumption the result is most sensitive to, and a reminder that any resulting financial action is human-gated.
