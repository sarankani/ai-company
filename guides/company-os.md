# The Company OS — System of Record & Value Chain

Part of the **Claude Workflows: AI Digital Employees Pack**. This is what turns a roster of AI employees into a company that can actually run an IT business end to end: a **persistent system of record** the whole company reads and writes, and the **value chain** that moves a customer from lead to cash to renewal.

The earlier version of this pack was stateless — employees generated artifacts but shared no records, so they couldn't coordinate a business. The Company OS fixes that.

## Where state lives

In production, the system of record is **Twenty CRM** (open-source, self-hosted or cloud) for business records, connected via the GraphQL API. AI employees read/write via **`scripts/twenty-client.mjs`** (env: `TWENTY_API_URL`, `TWENTY_API_KEY`). Every external write that changes stage or creates records **stays human-gated** — the gate protocol is unchanged, only the backend changed from custom to Twenty.

The lightweight **file-based system of record** under `company/` tracks governance records (approvals, questions, org config) — git is the audit trail for these:

```
company/
  accounts/<account-id>.md        # the customer/company
  contacts/<contact-id>.md        # people
  leads/<lead-id>.md              # raw inbound/outbound
  opportunities/<opp-id>.md       # qualified deals (the pipeline)
  estimates/<opp-id>.md           # effort/cost estimate
  quotes/<opp-id>.md              # valuation/pricing (CPQ output)
  proposals/<opp-id>.md           # the proposal/SOW sent
  pos/<po-id>.md                  # customer purchase orders (inbound)
  projects/<project-id>.md        # delivery projects
  sows/<project-id>.md            # statements of work
  milestones/<project-id>.md      # milestone + acceptance log
  invoices/<invoice-id>.md        # billing + collection status
  tickets/<ticket-id>.md          # support tickets
  vendors/<vendor-id>.md          # suppliers/subcontractors
  purchase-orders-out/<po-id>.md  # procurement (outbound POs)
  assets/<asset-id>.md            # inventory: licenses, devices, cloud resources
  registry.md                     # index of everything + current stage
```

Every record carries: an **id**, a **stage/status**, an **owner** (which employee), **links** to related records (an opportunity links to its account, estimate, quote, PO, project), a **history log**, and any **human-approval** stamps.

## The entities & their lifecycles

| Entity | Owner | Stages (status lifecycle) |
|---|---|---|
| **Lead** | sdr | new → contacted → qualified / disqualified |
| **Opportunity** | sales | discovery → scoping → proposal → negotiation → won / lost |
| **Estimate** | solutions-architect | draft → reviewed → approved |
| **Quote / Valuation** | finance + sales | draft → approved (internal) → sent → accepted |
| **Proposal / SOW** | sales + delivery-manager | draft → sent → signed |
| **Customer PO** (inbound) | sales → finance | received → verified → booked |
| **Project** | delivery-manager | kickoff → in-delivery → UAT → delivered → closed |
| **Milestone** | delivery-manager | planned → in-progress → delivered → accepted → invoiced |
| **Invoice** | finance | draft → sent → paid / overdue |
| **Ticket** | support | new → triaged → in-progress → resolved → closed |
| **Vendor** | procurement | prospective → approved → active |
| **Purchase Order (out)** | procurement | requested → approved → ordered → received |
| **Asset / License** | procurement/it-ops | procured → allocated → in-use → retired |

## The value chain (lead → cash → renewal)

```
 LEAD GEN ─▶ QUALIFY ─▶ DISCOVERY/SCOPE ─▶ ESTIMATE ─▶ VALUATION/PRICING ─▶ PROPOSAL
   sdr        sdr        solutions-arch      solutions-arch   finance+sales        sales
                                                                                     │
      ┌──────────────────────────────────────────────────────────────────────────────┘
      ▼
 NEGOTIATION ─▶ PO / CONTRACT ─▶ KICKOFF (SOW, resourcing, plan) ─▶ DEVELOP ─▶ UAT/ACCEPT
   sales           sales+finance    delivery-manager+eng-manager     eng pod    tester+client
                                                                                     │
      ┌──────────────────────────────────────────────────────────────────────────────┘
      ▼
 DELIVER/GO-LIVE ─▶ INVOICE ─▶ COLLECT ─▶ ONGOING SUPPORT (SLA) ─▶ ACCOUNT MGMT (QBR/renewal/upsell)
   devops+delivery    finance    finance     support               account-manager
```

Cross-cutting, running throughout:

```
 PROCUREMENT: need ─▶ vendor select ─▶ quote ─▶ PO(out) ─▶ receive          (procurement)
 INVENTORY:   asset register ◀─ receive · allocate to project/person · track licenses/cloud · retire
```

## Human-in-the-loop gates on the value chain

The money and commitment points always stop for a human:

| Stage | Gate — human approves before… |
|---|---|
| Valuation / Quote | sending pricing to a customer |
| Proposal / SOW | sending or signing |
| Customer PO | booking it as committed revenue |
| Kickoff | committing the delivery dates/resourcing |
| Milestone acceptance | marking accepted (triggers invoicing) |
| Invoice | sending it; and any collections action |
| Procurement PO (out) | approving spend / placing the order |
| Renewal / discount | committing terms |

## How employees coordinate through it

Work is no longer re-derived — it flows through records. Example: `sdr` qualifies a lead → writes `opportunities/OPP-042.md` (stage: discovery) → `solutions-architect` reads it, adds `estimates/OPP-042.md` → `finance` + `sales` produce `quotes/OPP-042.md` → on human approval `sales` sends the proposal → customer PO arrives → `delivery-manager` spins up `projects/PRJ-042.md` linked back to the opportunity → the eng employees deliver against its milestones → `finance` invoices on accepted milestones → `support` opens tickets against the delivered project → `account-manager` runs the QBR and flags the renewal. Every step reads the prior record and writes the next; the `registry.md` shows the whole company at a glance.

See `value-chain.md` for the lifecycle workflows that automate these chains, and `integrations.md` for the CRM/ERP/PSA connectors this maps onto in production.
