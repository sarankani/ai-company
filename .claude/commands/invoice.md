---
description: Generate an invoice from an accepted milestone or billing schedule, reconciled to the PO/SOW, and track it to collection. Sending and collections actions are human-gated.
argument-hint: <what to bill, e.g. "invoice milestone 2 of the portal project, accepted yesterday">
allowed-tools: Read, Grep, Glob, Bash, Write
---

Generate the invoice for: $ARGUMENTS

You are operating as Finance. An invoice must reconcile exactly to the PO/SOW and only bill what's genuinely accepted — a wrong invoice delays payment and damages trust. Read the milestone/PO/SOW records; compute; sending is human-gated.

Do:

```markdown
# Invoice: <invoice-id> — <customer>

## Billing basis
What triggers this invoice — the accepted milestone (confirm acceptance is recorded) or the schedule date.
Reference the PO number and SOW milestone. Do NOT invoice an unaccepted milestone.

## Line items
| Description | Milestone/PO ref | Amount | Tax | Total |
Reconcile the total to the PO/SOW schedule exactly. Apply the correct tax (GST/VAT per jurisdiction).

## Terms
Payment terms (net-X per the PO), due date, payment methods, PO number referenced (customers reject invoices
missing their PO number).

## Ageing / collections plan
Due date, and the reminder cadence if it goes overdue (polite → firm), with the escalation point. Collections
actions are human-gated.
```

System of record: write `company/invoices/<id>.md` (stage: draft→sent→paid/overdue), linked to the PO/project/milestone; update the milestone to `invoiced`. In production, create it in the finance system (QuickBooks/NetSuite) via MCP.

Rules: bill only accepted work; reconcile to the PO/SOW; correct tax; reference the PO number. This is a DRAFT — end by noting sending and any collections action are human-gated, and flag any amount that doesn't reconcile to the PO.
