# Integrations — Skills, Plugins & MCP Connectors (AI Digital Employees)

Digital employees are only as good as the tools they can reach. Each employee should use existing **skills** for polished deliverables, reuse the official **plugin skills** for their craft, and connect to the company's **real SaaS systems via MCP** — so they work against the actual GitHub repo, Jira board, Zendesk queue, CRM, and books, not descriptions of them.

## The principle (applies to every employee)

1. **Deliverables → the right skill.** A board deck → `pptx`; a budget/model → `xlsx`; an offer letter or policy → `docx`; a chart → `dataviz`; an ad/social visual → `canvas-design`; a signed PDF → `pdf`. Employees never hand-roll these formats.
2. **Craft → the plugin.** Product/design/engineering employees reuse the `product-management:*`, `design:*`, and `engineering:*` plugin skills; the pack's `productivity:*` plugin gives the whole company shared memory (`CLAUDE.md`) and task tracking.
3. **Real systems → MCP.** Each employee maps to the SaaS they'd use at a real company. Discover connectors with the **connector registry** (search it for the service, then suggest the connector to the user). The human-in-the-loop gates still apply — an employee may *read* freely via MCP but a **write/send to an external system (post, email, deploy, payment) stays human-approved**.
4. **Research → `deep-research`** for anything needing multi-source external facts (market, competitor, candidate, vendor).

## Per-employee integration map

| Employee | Deliverable skills | Plugin skills | MCP connectors (read freely; writes are gated) |
|---|---|---|---|
| `ceo` | `pptx` (board deck), `docx` | `product-management:*` | Slack/email (send gated), analytics, the registry for the above |
| `eng-manager` | `xlsx`, `dataviz` | `engineering:standup` | GitHub, Jira/Linear, CI |
| `hr` | `docx` (JD/offer/policy) | — | Greenhouse/Lever/Ashby, HRIS (BambooHR/Rippling), calendar |
| `finance` | `xlsx` (models/budgets), `dataviz` | — | Stripe, QuickBooks/Xero, the bank/billing (all writes gated) |
| `product-manager` | `docx` (PRD), `pptx` | `product-management:write-spec`, `roadmap-update`, `competitive-brief` | Jira/Linear, Notion/Confluence, analytics (Amplitude/Mixpanel) |
| `project-manager` | `xlsx` (capacity), `dataviz` | `product-management:sprint-planning`, `engineering:standup` | Jira/Linear/Asana, GitHub Issues |
| `designer` | `canvas-design`, `pdf` | `design:design-critique`, `accessibility-review`, `design-handoff`, `ux-copy`, `design-system` | Figma |
| `tech-writer` | `docx`, `pdf` | `engineering:documentation` | GitHub, Notion/Confluence, the docs site |
| `developer` | — (code) | `engineering:debug`, `code-review` | GitHub/GitLab (PRs), CI (merge/deploy gated) |
| `code-reviewer` | — | `engineering:code-review` | GitHub (read diff; approve gated) |
| `tester` | `xlsx` (test matrix) | `engineering:testing-strategy` | GitHub, the test/CI system, bug tracker |
| `devops` | — (IaC) | `engineering:deploy-checklist`, `incident-response` | GitHub Actions, Sentry/Datadog, PagerDuty, cloud (deploy gated) |
| `security` | `docx` (report) | `engineering:code-review` | GitHub, the SAST/dependency scanner, cloud IAM (read) |
| `sales` | `docx`/`pptx` (proposal/deck) | — | Salesforce/HubSpot/Pipedrive, email (send gated) |
| `marketing` | `canvas-design`, `pptx`, `docx` | `product-management:competitive-brief` | GA4, the ESP, the ad platforms, CMS (publish/spend gated) |
| `social-media` | `canvas-design` | — | the social platforms / a scheduler (Buffer/Hootsuite) — posting gated |
| `support` | `docx` (macros) | — | Zendesk/Intercom/Gorgias (reply/send gated), the bug tracker |
| `data-analyst` | `dataviz`, `xlsx` | `product-management:metrics-review` | the data warehouse (BigQuery/Snowflake), analytics, BI |

Company-wide: install the **`productivity:*` plugin** so every employee shares working memory (`CLAUDE.md`) and a task list — that's how they "remember" the company's context, people, and priorities across sessions.

## How this changes an employee's behavior

Before acting, an employee: (1) pulls real context from its connector (the actual PR, ticket, deal, ticket queue, or numbers), (2) does its work using the relevant plugin skill for craft, (3) produces the deliverable through the right output skill, and (4) **stops at the gate** for any external write — presenting the finished artifact plus "approve to send/post/deploy/pay?".

Example — `data-analyst` for a metrics review: query the **warehouse via MCP** → compute + verify (with the AI/ML pack's `data-validator`) → `dataviz` for the scorecard → `product-management:metrics-review` framing → hand the insight to `product-manager`/`ceo`; nothing external is sent without approval.

## Setup

Run the connector-registry search for the systems your company uses and connect them; install the `engineering`, `design`, `product-management`, and `productivity` plugins; and put your mission, brand voice, and key people in the root `CLAUDE.md` (via the productivity memory system) so every employee acts like *your* team. If a needed system has no connector, the employee works from attached exports and says the data is a snapshot — it never invents it.
