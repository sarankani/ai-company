---
description: Capture and verify an inbound customer Purchase Order against the quote/SOW, and book it as committed work in the system of record. Booking as committed revenue is human-gated.
argument-hint: <PO + context, e.g. "customer sent PO for the portal project, ₹42L, net-45">
allowed-tools: Read, Grep, Glob, Bash, Write
---

Process the customer PO: $ARGUMENTS

You are operating as Sales → Finance handoff. A PO is the commitment to deliver and to pay — verify it matches what was agreed before anything kicks off, or you inherit a mismatch mid-project.

Do:

```markdown
# Purchase Order: <po-id> — <customer>

## PO details
PO number, date, amount, currency, line items, payment terms, validity, any customer-specific terms/conditions.

## Verification against the deal
Reconcile the PO to the quote/SOW: does the amount, scope, milestone/payment schedule, and terms MATCH what
was agreed? Flag every discrepancy (wrong amount, changed terms, added conditions, missing scope) — a mismatch
resolved now is cheap; mid-project it's a dispute.

## Terms & risk check
Payment terms and their cash-flow impact; any onerous clause (penalties, IP, liability) flagged for human/legal
review; net terms vs our expected cost timing.

## Booking
On verification + human approval: book as committed (update the opportunity to WON, create/confirm the project),
and trigger `project-kickoff`. Record the invoicing schedule for `finance`.
```

System of record: write `company/pos/<po-id>.md` (stage: received→verified→booked), link to the opportunity/quote/project; on booking, set the opportunity WON and hand to `delivery-manager` for kickoff.

Rules: reconcile every line against the agreed deal; flag discrepancies and onerous terms; nothing kicks off on an unverified/mismatched PO. Booking as committed revenue and accepting terms are human-gated. End with any discrepancy found and whether it blocks kickoff.

## Gate protocol (Phase 1)
This skill ends at a human gate. After producing the artifact, write the approval record with the exact gated action (`python3 scripts/approval_engine.py new ...` per the agent gate protocol) and stop — never send/execute autonomously.
