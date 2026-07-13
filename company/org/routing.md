# Routing — gates → departments → humans

The single routing config for Evalyn's approval system (Tech Spec 001 §2.3). Read by every gate-hitting employee, the SLA/escalation job, and the Control Panel's authorization layer. **Changes to this file are themselves a gated action:** the affected Department Head proposes, the CEO approves (Plan 001 risk #5).

## 1. Gate → owning department

| gate id | Gate (CLAUDE.md §5) | Owning department | Special rule |
|---|---|---|---|
| `merge-deploy` | Merge / deploy / migrations | `engineering` | — |
| `external-comms` | Customer/prospect email, publish, post | `marketing-support` | customer-specific comms → `sales-delivery` |
| `money` | Move funds, approve spend, send invoice, discounts, sign | `people-finance` | — |
| `commitments` | Price, date, SLA, roadmap promise | `sales-delivery` | roadmap promises → `product-design` |
| `people` | Offers, terminations, ratings, comp | `people-finance` | **dual approval:** + CEO stamp required |
| `procurement` | Place order, sign vendor | `operations` | — |
| `revenue-booking` | Mark milestone accepted, book PO | `people-finance` | — |

## 2. Priorities & SLAs

| Priority | Meaning | First-response SLA | Escalation cadence | Clock |
|---|---|---|---|---|
| `P0` | Urgent — prod fix, customer-visible incident | 2 hours | every 1 hour | wall-clock |
| `P1` | Normal — proposal send, invoice, PR merge | 1 business day | every business day | business days |
| `P2` | Low — internal docs, calendars | 3 business days | after 3 business days | business days |

## 3. Escalation chain

```
assignee = first AVAILABLE of: department.approver → department.deputy → department.head → ceo
on availability change to unavailable: reassign that human's pending items immediately (hop: unavailable)
on SLA breach: move one hop along the chain (hop: sla-breach); notify previous + new assignee
chain exhausted: assign to ceo — the terminal, always-staffed backstop; NEVER unassigned
manual delegation: any authorized human → any authorized human in the department (hop: manual-delegate)
```

**Invariant (ADR-0004):** escalation only ever *reassigns*. There is no auto-approve, no auto-reject, no expiry state — the only transitions out of `pending` are a named human's decision or the requester's withdrawal.

## 4. Authorization

A human may decide an item if they hold **any seat** in the item's department, or the **ceo** seat. Dual-approval gates (`people`) require two distinct stamps: a `people-finance` seat-holder **and** the ceo. Seat membership resolves from `humans/*.md` `roles`.

## 5. Record conventions (Phase 1 — Tech Spec 001 §2.4)

Approval requests: `company/approvals/APR-<yyyymmdd>-<seq>.md` · questions: `company/questions/QST-<yyyymmdd>-<seq>.md` · states: `pending → approved | rejected | answered | withdrawn` · `hops` and `notified` are append-only.
