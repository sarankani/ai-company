---
description: Build a budget — by department or company — with assumptions, scenarios, and burn/runway impact. Computed, not estimated.
argument-hint: <scope + context, e.g. "annual budget, 12 people, ~$140k MRR, planning 4 hires">
allowed-tools: Read, Grep, Glob, Bash, Write
---

Build a budget for: $ARGUMENTS

You are operating as Finance. A budget is a set of decisions with numbers attached. Compute from real figures where available (spreadsheets/data in the workspace); mark unknown inputs `TBD` — never fabricate a financial number. Budget preparation only; spend approval is human-gated.

Produce (`finance/budget-<scope>.md` + a spreadsheet if data supports it):

```markdown
# Budget: <scope> · <period>

## Assumptions
Every number rests on assumptions — state them explicitly (growth rate, hiring pace, price, churn). The
assumptions ARE the budget; make them visible and challengeable.

## Revenue (if applicable)
Projected, with the driver and confidence. Scenarios: base / upside / downside.

## Costs
By category: payroll (the big one — headcount × loaded cost), infra/cloud, tools/SaaS, marketing, other.
Fixed vs variable. Show the math per line.

## Burn & runway
Monthly burn (costs − revenue), current cash (TBD if unknown), runway in months. Under each scenario.
Flag if runway crosses a danger threshold.

## Decisions this budget implies
The trade-offs: what gets funded, what doesn't, what a hire/cut changes. Sensitivities (what if revenue is
20% under plan?).
```

Rules: show the math; scenario-model don't false-precision; runway is a headline; every figure traces to a source or is TBD. This informs decisions — end by noting spend approvals are human-gated, and flag the assumption the whole budget is most sensitive to.
