# Evalyn — The AI Digital Company

**Evalyn** is an IT services company run by AI digital employees with **minimum human resources**: 23 AI employee personas do the work — sales, engineering, delivery, finance, marketing, support, operations — and **one human founder-operator approves at the gates**. Everything between the gates runs autonomously; nothing irreversible or external-facing happens without human sign-off.

Built on [Claude Code](https://claude.com/claude-code): the personas are agents, their skills are slash commands, and cross-functional work runs as multi-agent workflows.

## How it works

```
AI employees draft, build, estimate, triage, and prepare  →  a human approves  →  the action executes
```

- **`CLAUDE.md`** — the company's operating brain: identity, roster, system of record, value chain, and the absolute human-in-the-loop gates. Auto-loaded into every session.
- **`.claude/agents/`** — 23 digital employees, each with a job charter, skills, and escalation rules.
- **`.claude/commands/`** — 26 role skills (`/lead-gen`, `/estimate`, `/proposal`, `/invoice`, `/okrs`, …).
- **`.claude/workflows/`** — 7 lifecycle workflows that coordinate several employees at once.
- **`company/`** — the file-based system of record (accounts, leads, opportunities, quotes, POs, projects, invoices, tickets, assets…), created as the business runs. Swappable for a real CRM/ERP via MCP.
- **`guides/`** — the operating manual: `operating-model.md`, `company-os.md`, `value-chain.md`, `getting-started.md`, `integrations.md`.

## The roster (23 AI employees)

| Department | Employees |
|---|---|
| Leadership | `ceo`, `eng-manager` |
| People & Finance | `hr`, `finance` |
| Product & Design | `product-manager`, `project-manager`, `designer`, `tech-writer` |
| Engineering | `developer`, `code-reviewer`, `tester`, `devops`, `security` |
| Sales & Delivery | `sdr`, `sales`, `solutions-architect`, `delivery-manager`, `account-manager` |
| Marketing & Support | `marketing`, `social-media`, `support` |
| Operations | `procurement`, `data-analyst` |

Invoke one with *"use the `<name>` agent to …"*, run a role skill directly (e.g. `/qualify-lead`), or launch a workflow (e.g. `opportunity-to-proposal`).

## The value chain (lead → cash → renewal)

```
/lead-gen → /qualify-lead → opportunity-to-proposal (scope→estimate→valuation→proposal)
  → [HUMAN: price + send] → /purchase-order → project-kickoff → [HUMAN: commit dates]
  → deliver (engineering employees) → delivery-to-invoice → [HUMAN: accept + send invoice] → collect
  → support (/ticket-triage) → account-manager (/qbr) → renewal/upsell → sales
procurement-cycle + /asset-register supply and track resources throughout.
```

## Lifecycle workflows

| Workflow | What it runs |
|---|---|
| `opportunity-to-proposal` | Discovery → scope → estimate → pricing → sendable proposal (pricing/sending human-gated) |
| `project-kickoff` | Booked PO → SOW → resourcing → delivery plan → kickoff pack (date commitments human-gated) |
| `delivery-to-invoice` | Milestone → acceptance check → QA gate → invoice draft (acceptance/sending human-gated) |
| `procurement-cycle` | Buying need → vendor comparison → risk check → draft PO (spend human-gated) |
| `hiring-pipeline` | Role → JD → sourcing → interview loop → scorecard (hire decision human-gated) |
| `product-launch` | Cross-functional launch readiness → go/no-go (public actions human-gated) |
| `company-standup` | All departments report in parallel → CEO-level synthesis |

## The human gates (absolute)

AI employees **draft, don't send; prepare, don't execute; recommend, don't decide** at these points. All gates are held by the founder-operator:

merge/deploy · external comms · money movement & invoicing · price/date/SLA commitments · people decisions · placing orders · booking revenue.

## Getting started

1. Open this repo in Claude Code — `CLAUDE.md` loads automatically.
2. Fill the remaining `TBD`s in `CLAUDE.md` §0 (ICP, rate card, quarterly priorities) — they shape every employee.
3. Start the engine, e.g.:
   ```
   /okrs set this quarter's company OKRs
   /lead-gen build a lead list against our ICP
   Use the developer agent to implement <feature>
   ```
4. Read `guides/getting-started.md` for worked end-to-end tutorials.
