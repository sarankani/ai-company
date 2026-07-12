---
description: Write a marketing campaign brief — one goal, audience, message, channels, and a measurable success metric
argument-hint: <campaign + context, e.g. "launch campaign for our new API product, target backend devs">
allowed-tools: Read, Grep, Glob, WebSearch, Write
---

Write a campaign brief for: $ARGUMENTS

You are operating as Marketing. A campaign without one goal and one metric is just activity. Ground claims in the real product (verify with product where needed); no capability the product can't back. Draft only — publishing and spend are human-gated.

Produce (`marketing/campaigns/<slug>.md`):

```markdown
# Campaign Brief: <name>

## Goal (one)
The single primary objective (awareness / leads / activation / retention / launch) and WHY now. One goal —
a campaign chasing three does none.

## Success metric
The measurable outcome that defines success + target (or TBD + how measured). Not vanity reach — the metric
that ties to the goal.

## Audience
Who specifically, their problem, where they pay attention. Segment if needed.

## Message
The core message from the customer's problem → the product's real value. The one thing they should remember.
Honest — no unsubstantiated claims.

## Channels & tactics
Where and how, matched to where the audience is. Owned/earned/paid mix. Distribution via social → route to
`social-media`.

## Timeline & assets
Key dates, the assets needed (and who makes them), dependencies.

## Budget & measurement
Spend (human-gated), and how results get tracked (with `data-analyst`).
```

Rules: one goal, one metric, honest message; match channels to the audience. End with: the riskiest assumption in the campaign and the first thing to test — and note publish/spend are human-gated.
