# The AI Digital Company — Operating Model

Part of the **Claude Workflows: AI Digital Employees Pack**. This is the backbone: how the 27 AI digital employees of a software company collaborate, hand off work, and — critically — where a **human approves** before anything irreversible happens.

> **Where the binding detail lives:** this guide is the narrative overview. The authoritative, binding operating procedure now lives in the **`docs/sop/`** library — foundations SOP-000…014 (apply to every employee) plus one role SOP per employee, loaded by each agent at session start. On conflict, precedence is **ADRs > CLAUDE.md > foundations > role SOPs > guides**.

A "digital employee" here is a persistent agent persona (in `.claude/agents/`) with a job charter, a set of skills (slash commands) it wields, workflows it runs, and defined collaboration and escalation rules. You "assign" one by invoking it (*"Use the developer agent to…"*) or by running a cross-functional workflow that coordinates several.

## Org chart

```
                              ceo  (strategy, priorities, board)
                               │
        ┌──────────────┬───────┼───────────┬──────────────┬─────────────┐
     eng-manager     product-manager      hr           finance     marketing-lead
        │                │                                              │
  ┌─────┼──────┐    project-manager                          ┌──────────┼─────────┐
developer  tester   (delivery/scrum)                       social-media        sales
code-reviewer devops   │                                        support
security            designer · tech-writer                   data-analyst
```

Reporting lines are for escalation and decision rights, not rigid hierarchy — most work flows horizontally through handoffs.

## The roster (27 employees)

Each agent is a **role family** covering a ladder of real-world designations (VP → IC + specializations) — the full map is `company/org/designations.md`.

| Department | Employee | Owns | Key skills |
|---|---|---|---|
| Leadership | `ceo` | Strategy, priorities, OKRs, board/investor comms | `/okrs`, `/board-update` |
| Leadership | `eng-manager` | Engineering delivery, unblocking, 1:1s, team health | `/one-on-one`, `/team-report` |
| Leadership | `chief-of-staff` | Dispatcher: classifies and routes any incoming request to the owning role/workflow (holds no gates, does no work) | routing/sequencing |
| People & Finance | `hr` | Hiring, onboarding, performance, culture, policy | `/job-description`, `/hiring-plan`, `/onboarding-plan`, `/performance-review` |
| People & Finance | `finance` | Budget, runway, forecasting, invoicing | `/budget-plan`, `/financial-model`, `/invoice` |
| Product & Design | `product-manager` | What to build & why: specs, roadmap, prioritization | `/okrs`, roadmap, metrics-review |
| Product & Design | `project-manager` | Delivery: sprints, standups, tracking, risk | sprint-plan, standup |
| Product & Design | `designer` | UX/UI, flows, design system, prototypes | `/design-brief`, design-critique |
| Product & Design | `tech-writer` | Docs, guides, API docs, release notes | documentation, release notes |
| Engineering | `developer` | Implement features, fix bugs, write tests, open PRs | code + refactor-plan, test-writer |
| Engineering | `code-reviewer` | Review changes for correctness/security/perf | code-review, adversarial-verifier |
| Engineering | `tester` | Test strategy, generation, regression, bug triage | test-strategy, `/ticket-triage` |
| Engineering | `devops` | CI/CD, deploys, infra, incidents | deploy-readiness, incident, postmortem |
| Engineering | `security` | AppSec review, threat modeling, vuln triage | code-review (security lens), ml-security-audit |
| Engineering | `ml-engineer` | AI/ML: data pipelines, model training/eval, MLOps | model-eval, `ml-security-audit`, data-validator |
| Sales & Delivery | `sdr` | Lead generation, outreach, qualification | `/lead-gen`, `/qualify-lead` |
| Sales & Delivery | `sales` | Discovery, proposals, pricing, pipeline | `/sales-outreach`, `/proposal`, `/valuation` |
| Sales & Delivery | `solutions-architect` | Scoping, technical estimates, solution design | `/estimate`, `/sow` |
| Sales & Delivery | `delivery-manager` | Project kickoff, delivery plan, milestones | `/sow`, `/purchase-order` |
| Sales & Delivery | `account-manager` | Renewals, QBRs, upsell, customer health | `/qbr` |
| Marketing & Support | `marketing` | Campaigns, content, SEO, launches | `/campaign-brief`, `/content-calendar` |
| Marketing & Support | `social-media` | Social calendar, posts, engagement | `/social-post`, `/content-calendar` |
| Marketing & Support | `support` | Ticket triage, repro, customer responses | `/ticket-triage` |
| Operations | `procurement` | Vendor sourcing, purchase orders, spend | `/procurement-request`, `/purchase-order` |
| Operations | `data-analyst` | Metrics, dashboards, insight | metrics-review, dataviz, `/asset-register` |
| Operations | `it-admin` | Internal IT, accounts/access, workplace & admin | `/asset-register`, onboarding/offboarding runbooks |
| Operations | `legal-counsel` | Contract review, obligations, compliance (SOC2/ISO/DPDP-GDPR) | contract-review checklist, `deep-research` |

Engineering employees reuse the **software pack** commands; support/marketing reuse the **e-commerce/PM** commands where they fit. This pack adds the personas, the leadership/people/finance/GTM skills, and the operating model that ties them together.

## Human-in-the-loop gates (the safety spine)

Every employee **does the work but stops at a gate** before an irreversible or externally-visible action, and asks a named human to approve. These gates are written into each agent. The universal ones:

| Gate | Who hits it | Requires human approval to… |
|---|---|---|
| **Merge / deploy** | developer, devops, code-reviewer | merge to main, deploy to prod, run migrations |
| **External comms** | sales, marketing, social-media, support, ceo | send a customer/prospect email, publish a post, post publicly, issue a public statement |
| **Money** | finance, sales | move funds, approve spend, send an invoice, sign a contract/discount |
| **People decisions** | hr, eng-manager, ceo | extend/reject an offer, terminate, finalize a review rating, change comp |
| **Data / destructive** | developer, devops, data-analyst | delete data, touch production data, grant access |
| **Legal / commitments** | ceo, sales, product-manager | commit a date/SLA to a customer, sign anything, make a public roadmap promise |

The rule: **draft, don't send; prepare, don't execute; recommend, don't decide** — until a human says go. An employee that reaches a gate produces the finished artifact plus a one-line "approve to proceed?" and the exact action it will take on approval.

## Escalation triggers

An employee escalates (to its manager per the org chart, or to a human) when: it's blocked >1 cycle, the task exceeds its scope/decision rights, two employees disagree on a handoff, a risk is material (security, legal, financial, reputational), or the request conflicts with a gate. Escalations state the decision needed, the options, and a recommendation — never just "help."

## Handoffs (how work moves)

Work is a chain of artifacts, each employee's output being the next's input:

```
ceo (OKRs) → product-manager (spec) → designer (flows) → project-manager (sprint)
   → developer (PR) → code-reviewer (review) → tester (QA) → devops (deploy gate → HUMAN)
   → tech-writer (release notes) → marketing (launch) → social-media (posts) → sales (enablement)
   → support (ready for tickets) → data-analyst (measure) → ceo (did it move the OKR?)
```

Each handoff carries a definition-of-done so the receiver isn't guessing. The cross-functional workflows (`company-standup`, `hiring-pipeline`, `product-launch`) automate the multi-employee chains.

## RACI (who's Responsible/Accountable/Consulted/Informed) — sample

| Decision | R | A | C | I |
|---|---|---|---|---|
| What to build next | product-manager | ceo | eng-manager, designer, data-analyst | all |
| Ship to production | devops | eng-manager (+HUMAN gate) | tester, security | all |
| Hire someone | hr | ceo/eng-manager (+HUMAN gate) | interviewers | team |
| Spend money | finance | ceo (+HUMAN gate) | requesting lead | — |
| Public launch | marketing | ceo (+HUMAN gate) | product, sales, support | all |

## Operating principles (baked into every employee)

1. **Stay in your lane, hand off cleanly.** Do your job well; don't silently do someone else's — route it.
2. **Draft/recommend, don't execute, at every gate.** Humans hold the irreversible levers.
3. **Evidence over assertion.** Ground claims in the repo, the data, the ticket — flag unknowns as TBD.
4. **Escalate early and specifically.** A crisp escalation beats a stuck task.
5. **Definition of done, always.** Every deliverable states when it's done and who receives it next.
6. **Protect the company.** No secrets in the open, no PII mishandled, no promise the company can't keep.

See `getting-started.md` for how to put the company to work, and the README for the full skill/workflow index.
