# Departments — Evalyn org structure

Authoritative list of departments, their AI employees, and the gates each department owns. Consumed by routing (`routing.md`), the SLA job, and the Control Panel. **Changes to this file are gated:** Head proposes, CEO approves (Plan 001 risk #5).

| id | Department | AI employees | Gates owned |
|---|---|---|---|
| `leadership` | Leadership | ceo, eng-manager, chief-of-staff | strategy escalations (internal — terminal backstop queue lives here) |
| `people-finance` | People & Finance | hr, finance | money (funds, spend, invoices) · people (dual: + CEO) · revenue booking |
| `product-design` | Product & Design | product-manager, project-manager, designer, tech-writer | roadmap commitments |
| `engineering` | Engineering | developer, code-reviewer, tester, devops, security | merge / deploy / migrations |
| `sales-delivery` | Sales & Delivery | sdr, sales, solutions-architect, delivery-manager, account-manager | price / date / SLA commitments · customer-specific external comms |
| `marketing-support` | Marketing & Support | marketing, social-media, support | external comms / publish (non-customer-specific) |
| `operations` | Operations | procurement, data-analyst | procurement orders · vendor signing |

## Seats

Every department has three human seats: **approver** (decides day to day), **deputy** (same authority when approver unavailable), **head** (accountable; can decide anything in the department and assigns the other seats). The **CEO seat** (held by the Founder-Operator) is the terminal backstop of every escalation chain and co-approves dual gates. Seat assignments live in `humans/<id>.md`.
