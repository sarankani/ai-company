---
description: Visualize the AI employee roster — org chart, gate ownership, value-chain coverage, or workflow participation — as Mermaid diagrams grounded in the actual agent and org config files
argument-hint: <view + focus, e.g. "org chart", "gates", "value-chain", "workflows", or "agent developer"> (default: org chart)
allowed-tools: Read, Grep, Glob, Bash, Write
---

Visualize the agents: $ARGUMENTS

You are producing a **diagram of the company as it actually is configured**, not as CLAUDE.md describes it from memory. Ground every node and edge in the source files — a visualization that drifts from the config is worse than none, because humans will route work by it.

## Sources of truth (read before drawing)

- `.claude/agents/*.md` — the roster: one file per AI employee; frontmatter `name`, `description`, `tools`; body sections "You own", "You do NOT own", "Human-in-the-loop gates", "Escalate when".
- `company/org/departments.md` — department → employees → gates-owned mapping (authoritative).
- `company/org/routing.md` + `company/org/humans/` — gate routing, human seats, escalation chain.
- `.claude/workflows/*.js` — lifecycle workflows and which agents each one invokes.
- `CLAUDE.md` §2 (roster) and §4 (value chain) — for cross-checking only; if it disagrees with the files above, note the drift in the output.

## Views (pick from $ARGUMENTS; default = org chart)

1. **Org chart** — departments as subgraphs, each containing its AI employees; human seats (Approver/Deputy/Head, CEO backstop) attached to each department. Mermaid `flowchart TD`.
2. **Gates** — each gate type → owning department → the agents whose charters reference it → the escalation chain (`approver → deputy → head → ceo`). Makes visible where autonomy stops.
3. **Value chain** — the lead→cash→renewal flow from CLAUDE.md §4 with each stage annotated by the owning agent(s) and human gates marked as distinct nodes (e.g. red/diamond).
4. **Workflows** — one diagram per requested workflow (or an overview of all 7): the stage sequence and which agent runs each stage; derive the agent list by grepping the workflow `.js` for agent invocations, don't guess.
5. **Agent detail** (`agent <name>`) — a single employee: what it owns, its tools, which workflows invoke it, which gates it stops at, who it escalates to and hands off to.

## Output

Produce a markdown document containing:

```markdown
# Agent visualization: <view> · <date>

## Diagram
One or more Mermaid code blocks (```mermaid). Keep each diagram under ~30 nodes —
split into multiple diagrams rather than producing an unreadable hairball.

## Legend
Node/edge conventions used (AI employee vs human seat vs gate vs workflow).

## Notes
- Coverage gaps: agents in the roster missing from every workflow, gates with no owning agent, etc.
- Drift: any mismatch found between CLAUDE.md, `company/org/`, and `.claude/agents/` — listed explicitly.
```

If asked to save, write it to `docs/org/agent-map-<view>.md` (create the directory if needed); otherwise output inline.

## Rules

- Every node must correspond to a real file or a real entry in `departments.md` — no invented agents, gates, or humans.
- Human gates are always visually distinct from AI employees (different shape/class in Mermaid) — the whole point of the map is showing where humans sit.
- Style Mermaid with `classDef` (e.g. `human`, `agent`, `gate`, `workflow` classes) so diagrams render consistently; don't rely on default colors carrying meaning.
- Quote agent names exactly as their `name:` frontmatter (they're invocation handles).
- Validate Mermaid syntax mentally before emitting — a diagram that doesn't render is a defect.
- End with: the single most load-bearing agent (appears in the most flows) and the least-connected one (a candidate for a charter review).
