# Getting Started — Putting Your AI Company to Work

Part of the **Claude Workflows: AI Digital Employees Pack**. This shows how to "hire" and assign the 24 AI digital employees, with worked examples. Read `operating-model.md` first for the org chart and the human-in-the-loop gates.

## Install

Copy the `.claude/` tree into your repo (team-shared) or `~/.claude/` (personal):

```
.claude/
├── agents/      24 digital employees (ceo, hr, developer, sales, …)
├── commands/    16 role skills (/okrs, /job-description, /sales-outreach, …)
└── workflows/   3 cross-functional workflows (company-standup, hiring-pipeline, product-launch)
```

Engineering/support/PM employees also reuse commands from the **software**, **e-commerce**, and **product-management** packs — install those alongside for full skill coverage.

## Three ways to put the company to work

**1. Assign one employee** — invoke a persona for a role-specific task:

> Use the developer agent to implement the team-invite feature from `docs/specs/invite.md`.

The `developer` persona picks up the job, works to spec, writes tests, opens a PR — and **stops at the merge gate** for your approval.

**2. Use a role's skill directly** — a slash command:

```
/sales-outreach cold outreach to a fintech CTO, we sell fraud-detection APIs
/okrs set Q3 company OKRs, focus on activation and retention
/job-description senior backend engineer, Go + Postgres, remote India
```

**3. Run a cross-functional workflow** — coordinate several employees at once:

> Run the product-launch workflow with args {"launch": "v2 API", "date": "2026-08-01", "scope": "GA"}

---

## Tutorial 1 — A feature, end to end (the handoff chain)

Watch work flow through the company, each employee handing a finished artifact to the next:

```
1. Use the product-manager agent to write a spec for "bulk CSV import".
        → docs/specs/bulk-import.md (problem, acceptance criteria, metric)
2. Use the designer agent to produce a design brief from that spec.
        → design/briefs/bulk-import.md (flows, every state, accessible handoff)
3. Use the project-manager agent to slot it into the sprint.
        → capacity-honest plan, acceptance criteria attached
4. Use the developer agent to build it.
        → PR opened, tests green — STOPS at merge gate (you approve)
5. Use the code-reviewer agent on the PR.
        → ranked, verified findings + recommendation (you merge)
6. Use the tester agent to QA it.
        → go/no-go with evidence
7. Use the devops agent for release readiness.
        → deploy-readiness verdict — STOPS at deploy gate (you approve)
8. Use the tech-writer agent for release notes.
        → drafted, accurate to shipped behavior
9. Use the data-analyst agent to measure the success metric after launch.
        → did it move the number the PM defined?
```

Every arrow is a handoff with a definition-of-done, and every externally-visible or irreversible step (merge, deploy, publish) waits for a human. That's the whole model: **the company runs the process; you hold the levers.**

---

## Tutorial 2 — Monday company standup (`company-standup`)

> Run the company-standup workflow with args {"period": "this week"}

Six functions report in parallel — engineering, product, delivery, go-to-market, people-finance, support-data — each grounding its status in real signal (git/PRs, tickets, metrics). Then the `ceo` synthesizes a roll-up: overall state, top cross-company risks with owners, and the one decision to make now.

```json
{
  "period": "this week",
  "highRisks": [
    { "department": "engineering", "risk": "payments refactor slipping, blocks the launch", "severity": "high", "mitigation": "cut scope to v1 flags" }
  ],
  "decisionsNeeded": [
    { "department": "people-finance", "need": "approve the 2 eng offers (human-gated)" },
    { "department": "go-to-market", "need": "sign off launch messaging before it publishes" }
  ],
  "execSummary": "On track for the v2 launch except the payments refactor… one decision needed: …"
}
```

A whole-company status in one command — with the human decisions surfaced, not buried.

---

## Tutorial 3 — Hiring, prepared consistently (`hiring-pipeline`)

> Run the hiring-pipeline workflow with args {"role": "Senior Frontend Engineer", "context": "React, remote EU, comp band TBD"}

`hr` defines the success profile and core competencies, then builds the JD, sourcing plan, structured interview loop, and bias-aware scorecard **in parallel**, and runs a final fairness check over the whole kit. You get a complete, consistent hiring kit — and the **hire decision, offer, and every candidate message stay human-gated**. Comp band it doesn't know comes back as an open question, never invented.

---

## Tutorial 4 — A launch across the whole company (`product-launch`)

> Run the product-launch workflow with args {"launch": "AI search feature", "scope": "GA", "date": "2026-09-15"}

Product, engineering/QA, docs, marketing, sales, support, and social each prepare their launch readiness in parallel; the `ceo` returns a **GO / GO-WITH-RISKS / NO-GO** with blockers, owners, and — importantly — the checklist of human-gated actions (deploy, publish posts, send enablement) to approve on launch day.

---

## The human-in-the-loop contract (read this)

Every employee is built to **draft, don't send; prepare, don't execute; recommend, don't decide** at these gates:

- **Merge / deploy / migrations** — developer, code-reviewer, devops
- **External comms** (customer email, public post, announcement) — sales, marketing, social-media, support, ceo
- **Money** (spend, invoice, contract, discount) — finance, sales
- **People** (offer, termination, rating, comp) — hr, eng-manager, ceo
- **Destructive / data** (delete, prod data, access grants) — developer, devops, data-analyst

When an employee reaches a gate, it hands you the finished artifact plus "approve to proceed?" and the exact action it will take. You stay in control of everything irreversible.

## Tips

- **Set the company's context once.** Put your mission, priorities, and brand voice in a `CLAUDE.md` at the repo root — every employee reads it, so they act like *your* company's team.
- **Chain employees explicitly** for multi-role work, or use the workflows to automate the common chains.
- **Escalations are a feature.** An employee that stops and asks a crisp question (options + recommendation) is working correctly, not failing.
- **Combine with the other packs.** The engineering employees are far stronger with the software + AI/ML packs installed; support/marketing with the e-commerce + PM packs.
