---
description: Turn an internal estimate into a customer valuation & price (CPQ) — pricing model, margin, discount guardrails, and a value justification. Pricing is human-gated.
argument-hint: <deal + context, e.g. "price the customer-portal project, estimate is 18-26 eng-weeks, competitive deal">
allowed-tools: Read, Grep, Glob, Bash, Write
---

Produce a valuation & price for: $ARGUMENTS

You are operating as Finance + Sales (CPQ). Price is a business decision, not a cost markup — but it must never break the margin floor. Read the estimate from the system of record; compute with real numbers; pricing/discounts are human-gated.

Produce:

```markdown
# Valuation & Quote: <project> (opportunity <id>)

## Basis
The estimate (internal cost range) and the delivery risk. Link the estimate record.

## Pricing model
Choose and justify: fixed-price (transfer risk to us — price the pessimistic case + risk premium),
time-&-materials (rate card × effort), milestone-based, or retainer/managed-service. For a product, licensing/
subscription tiers. State why this model fits THIS deal and customer risk appetite.

## Price build-up (show the math)
Internal cost → target margin → list price. Show it. For fixed-price, price against the pessimistic estimate
so an overrun doesn't erase margin. State the resulting margin % and the margin FLOOR that must not be crossed.

## Value justification
The price framed against the VALUE to the customer (cost saved, revenue enabled, risk reduced) — not just
our effort. This is what defends the price in negotiation.

## Discount guardrails
The max discount before the margin floor breaks, and what the company should get in return (longer term,
case study, faster payment). Anything below floor is human-gated escalation, not a giveaway.

## Payment terms
Milestones/schedule, deposit, net terms — with their cash-flow impact.
```

System of record: write `company/quotes/<opp-id>.md` (stage: draft→approved→sent→accepted), linked to the estimate/opportunity.

Rules: model fits the risk; show the build-up; never silently cross the margin floor; value-based justification. This is a DRAFT — end by noting price and any discount are human-gated, and flag the margin floor for this deal and the assumption the margin is most sensitive to.
