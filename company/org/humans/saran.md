---
id: saran
name: Saran
email: saranpkani@gmail.com
title: Founder / CEO / Human Operator
availability: available        # available | busy | ooo
ooo_until: null                # ISO date when availability = ooo
roles:
  # ceo seat — terminal backstop of every escalation chain + dual-approval co-signer
  - {department: leadership, seat: ceo}
  # n=1 starting state: founder holds every seat in every department.
  # Hiring (EX-305/306) hands these over one department at a time.
  - {department: leadership, seat: approver}
  - {department: leadership, seat: deputy}
  - {department: leadership, seat: head}
  - {department: people-finance, seat: approver}
  - {department: people-finance, seat: deputy}
  - {department: people-finance, seat: head}
  - {department: product-design, seat: approver}
  - {department: product-design, seat: deputy}
  - {department: product-design, seat: head}
  - {department: engineering, seat: approver}
  - {department: engineering, seat: deputy}
  - {department: engineering, seat: head}
  - {department: sales-delivery, seat: approver}
  - {department: sales-delivery, seat: deputy}
  - {department: sales-delivery, seat: head}
  - {department: marketing-support, seat: approver}
  - {department: marketing-support, seat: deputy}
  - {department: marketing-support, seat: head}
  - {department: operations, seat: approver}
  - {department: operations, seat: deputy}
  - {department: operations, seat: head}
created: 2026-07-13
---

# Saran — Founder / CEO / Human Operator

Holds every seat (n=1 starting state per ADR-0003). With all chain positions occupied by the same human, escalation collapses to the CEO queue — by design, items still never dead-end. Seat handovers are people-gated and recorded here as `roles` changes (history via git).
