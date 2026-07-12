# The IT Company Value Chain — Lead to Cash to Renewal

Part of the **Claude Workflows: AI Digital Employees Pack**. This is the operational heart of running an IT company: the end-to-end flow that turns a stranger into a paying, renewing customer, with the lifecycle workflows that move each deal through it. Read `company-os.md` first for the entities and system of record.

## The chain, and who owns each stage

| # | Stage | Owner(s) | Artifact / record | Workflow or skill |
|---|---|---|---|---|
| 1 | Lead generation | `sdr` | `leads/` | `/lead-gen` |
| 2 | Qualification | `sdr` | `opportunities/` (created) | `/qualify-lead` |
| 3 | Discovery & scope | `solutions-architect`, `sales` | opportunity notes | `opportunity-to-proposal` |
| 4 | Estimate | `solutions-architect` | `estimates/` | `/estimate` |
| 5 | Valuation & pricing | `finance`, `sales` | `quotes/` | `/valuation` |
| 6 | Proposal | `sales`, `delivery-manager` | `proposals/` | `opportunity-to-proposal` |
| 7 | Negotiation & PO | `sales`, `finance` | `pos/` | `/purchase-order` |
| 8 | Kickoff (SOW, resourcing, plan) | `delivery-manager`, `eng-manager` | `sows/`, `projects/` | `project-kickoff` |
| 9 | Develop / deliver | eng pod (`developer`, `tester`, `devops`…) | `milestones/` | software pack workflows |
| 10 | UAT & acceptance | `delivery-manager`, `tester`, client | `milestones/` (accepted) | `delivery-to-invoice` |
| 11 | Invoice & collect | `finance` | `invoices/` | `delivery-to-invoice` |
| 12 | Ongoing support (SLA) | `support` | `tickets/` | `/ticket-triage`, `/sla-report`* |
| 13 | Account management | `account-manager` | `accounts/` (health), new `opportunities/` | `/qbr` |
| — | Procurement (cross-cutting) | `procurement` | `vendors/`, `purchase-orders-out/` | `procurement-cycle` |
| — | Inventory / assets (cross-cutting) | `procurement`/it-ops | `assets/` | `/asset-register` |

Every stage reads the prior record and writes the next — that's what makes it a company, not a pile of one-shot tasks.

---

## Tutorial 1 — From qualified lead to a sendable proposal (`opportunity-to-proposal`)

**Scenario.** The SDR qualified an opportunity: a retailer wants a customer portal.

> Run the opportunity-to-proposal workflow with args {"opportunity": "OPP-042 Acme portal", "brief": "customer portal: auth, dashboard, order history, 3 integrations; wants it before Q4; budget hinted ~₹40L", "model": "fixed"}

Six phases: **discovery** structures requirements + the unknowns to confirm (never invents budget); **scope** (solutions-architect) outlines the solution + explicit out-of-scope; **estimate** decomposes effort into optimistic/likely/pessimistic weeks with buffers and risks; **value** (finance+sales) picks the pricing model and — for fixed-price — **prices against the pessimistic estimate + risk premium**, shows the cost→margin→price build-up, and sets the margin floor; a **deal-risk review** adversarially checks for underestimation, margin risk, and unresolved unknowns priced as known; then the **proposal** is assembled.

```json
{
  "recommendation": "propose-with-conditions",
  "effortWeeks": { "optimistic": 16, "likely": 22, "pessimistic": 30 },
  "pricingModel": "fixed-price (priced at pessimistic + 12% risk premium)",
  "marginFloor": "no discount below 18% margin",
  "dealBreakers": [],
  "openUnknowns": ["Which 3 integrations exactly? affects effort ±6 weeks"],
  "humanGates": ["pricing/discount approval", "sending the proposal", "accepting any onerous term"]
}
```

The one unresolved unknown (which integrations) is flagged, not buried — because it swings the estimate by 6 weeks. Pricing and sending wait for a human.

---

## Tutorial 2 — PO in, project set up to deliver (`project-kickoff`)

**Scenario.** Acme signed and sent a PO.

> Run the project-kickoff workflow with args {"project": "PRJ-042 Acme portal", "po": "PO#7781, ₹41L, net-45, 4 milestones", "deal": "quotes/OPP-042"}

It **verifies the PO against the agreed deal first** (a mismatch resolved now is cheap; mid-project it's a dispute), then builds the SOW, resourcing plan, and delivery plan **in parallel**, compiles a delivery risk register, and assembles the kickoff pack — setting `projects/PRJ-042.md` to kickoff and linking PO/SOW/milestones.

```json
{
  "poVerified": true,
  "discrepancies": [],
  "topRisks": [
    { "risk": "3rd integration vendor API undocumented", "likelihood": "high", "impact": "high", "owner": "solutions-architect" }
  ],
  "outputs": ["company/sows/prj-042.md", "company/projects/prj-042.md"],
  "humanGates": ["committing delivery dates & resourcing to the client", "agreeing any change order", "accepting onerous PO terms"]
}
```

If the PO *didn't* match the deal, it would stop before kickoff and flag the discrepancy — the correct behavior.

---

## Tutorial 3 — Milestone to cash (`delivery-to-invoice`)

**Scenario.** Milestone 2 is delivered.

> Run the delivery-to-invoice workflow with args {"project": "PRJ-042", "milestone": "M2 — dashboard + order history"}

It **verifies the deliverable against the SOW's acceptance criteria** (each criterion, with evidence), runs a QA + security gate in parallel, prepares the client acceptance package, and drafts the invoice **reconciled exactly to the PO/SOW milestone** with the right tax and PO reference. Critically: **it will not invoice an unaccepted milestone** — if a criterion isn't met, it stops with the gaps and generates no invoice.

```json
{
  "milestoneReady": true,
  "status": "ready-for-acceptance-and-invoice",
  "outputs": ["milestone acceptance package", "company/invoices/INV-018.md (draft)"],
  "humanGates": ["client acceptance sign-off", "sending the invoice", "any collections action"]
}
```

---

## Tutorial 4 — Buying what delivery needs (`procurement-cycle`)

**Scenario.** The project needs a monitoring tool.

> Run the procurement-cycle workflow with args {"need": "APM/monitoring for the Acme portal, prod", "quantity": "team of 6", "budget": "≤$300/mo"}

It **checks the asset register for reclaim first** (do we already own something idle that covers this?), right-sizes the quantity, sources three options in parallel (best-fit / value / incumbent-or-OSS to test lock-in), runs a security/data-risk review, and drafts the outbound PO — with the renewal date to track and the asset-register entries to create on receipt. Spend approval and ordering are human-gated.

```json
{
  "rightSizedQuantity": "6 seats (requested 10 — 4 would be idle)",
  "reclaimAvailable": [],
  "optionsCompared": [{ "vendor": "Datadog", "tco": "$..." }, { "vendor": "Grafana Cloud", "tco": "$..." }, { "vendor": "self-hosted Prometheus+Grafana", "tco": "eng time" }],
  "needsSecurityReview": true,
  "humanGates": ["approving the spend", "signing the vendor agreement", "placing the order"]
}
```

Right-sizing 10→6 seats and checking reclaim first is exactly the waste-control a real procurement function does.

---

## The whole loop, in one line each

```
/lead-gen → /qualify-lead → opportunity-to-proposal → [human: approve price + send]
  → /purchase-order → project-kickoff → [human: commit dates] → (software pack delivery)
  → delivery-to-invoice → [human: accept + send invoice] → collect
  → /ticket-triage + /sla-report (support) → /qbr (account-manager) → renewal/upsell → back to sales
procurement-cycle + /asset-register run throughout to supply and track what delivery needs.
```

Every money-and-commitment point (`[human: …]`) stops for approval. The `registry.md` in the Company OS shows every account, deal, project, invoice, and ticket at a glance — the CEO's single view of the business.

\* `/sla-report` and a couple of support/HR skills are covered by the base pack and the software/e-commerce packs; see the operating model for the full skill index.
