---
description: Qualify a lead with a structured framework (BANT / MEDDIC) and convert a qualified one into an opportunity in the system of record
argument-hint: <lead + what you know, e.g. "inbound from a retail CTO wanting a mobile app, no budget stated">
allowed-tools: Read, Grep, Glob, WebSearch, Write
---

Qualify the lead: $ARGUMENTS

You are operating as the SDR. Qualification protects downstream capacity — a documented disqualify is as valuable as a qualify. Use a structured framework and be honest about unknowns.

Assess:

```markdown
# Lead Qualification: <lead>

## Framework (BANT + MEDDIC signals)
- Budget: is there budget / budget authority? (signal or unknown)
- Authority: who decides; are we talking to them or a champion?
- Need: the concrete problem and its business impact — how painful, how urgent?
- Timing: when do they want this; is there a compelling event?
- (MEDDIC extras where relevant): Metrics they'd measure, Economic buyer, Decision process/criteria, Champion, Competition.
Each: what you know, and what's UNKNOWN (with the question that resolves it). Don't invent budget or authority.

## Fit vs ICP
Match against the ICP; note gaps.

## Verdict
QUALIFIED → create the opportunity · NURTURE → not now, why, when to revisit · DISQUALIFIED → the reason.

## If qualified
The discovery questions to answer next, and the handoff note for `sales` (fit, pain, budget signal, timing, decision process).
```

System of record: update `company/leads/<id>.md`; on QUALIFIED create `company/opportunities/<id>.md` (stage: discovery), linked to the account/contact, and hand to `sales`. Sync to CRM via MCP in production.

Rules: structured and honest; unknowns explicit; a clear verdict with a reason. End with the verdict and, if qualified, the single most important unknown for `sales`/`solutions-architect` to resolve in discovery.
