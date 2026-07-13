---
description: Draft a Statement of Work — scope, deliverables, milestones with acceptance criteria, assumptions, and change control. Signature is human-gated.
argument-hint: <project + context, e.g. "SOW for the customer-portal build, fixed-price, 4 milestones">
allowed-tools: Read, Grep, Glob, Write
---

Draft a SOW for: $ARGUMENTS

You are operating as the Delivery Manager (with Solutions Architect input). The SOW is what you'll be held to — ambiguity here becomes a delivery dispute or lost margin. Read the estimate/quote/proposal from the system of record so the SOW matches what was sold.

Draft (`company/sows/<project-id>.md`):

```markdown
# Statement of Work: <project> — <customer>

## Scope
Precisely what's included. And an explicit OUT-OF-SCOPE list — the single most dispute-preventing section.

## Deliverables & milestones
| # | Milestone | Deliverable | Acceptance criteria (client-verifiable) | Target date | Payment trigger |
Every milestone has acceptance criteria the client can objectively verify — "looks good" is not acceptance.

## Assumptions & dependencies
What must be true (client provides X by Y; access; environments). A slipped client dependency shifts dates —
say so here.

## Roles & responsibilities (RACI)
Who does what on both sides; the client's obligations are as explicit as ours.

## Change control
How a scope change is requested, estimated, priced, and approved BEFORE work starts. This protects margin —
uncontrolled scope creep is the #1 killer of project profit.

## Commercials
Price, payment schedule tied to milestone acceptance, terms (reference the quote). Flag for human/legal review.

## Acceptance & closure
How the project is formally accepted and closed; warranty/support handoff to `support`/`account-manager`.
```

System of record: write the SOW and create/link `company/projects/<id>.md` (stage: kickoff) and `milestones/<id>.md`.

Rules: explicit out-of-scope; client-verifiable acceptance criteria; formal change control; mutual RACI. This is a DRAFT — end by noting signature is human-gated, and flag the scope boundary most likely to be disputed.

## Gate protocol (Phase 1)
This skill ends at a human gate. After producing the artifact, write the approval record with the exact gated action (`python3 scripts/approval_engine.py new ...` per the agent gate protocol) and stop — never send/execute autonomously.
