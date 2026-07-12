# ADR-0006 — Authoring skills, not dynamic agent creation

- **Status:** Proposed — awaiting Saran
- **Source:** Plan 001 Part G

## Context

The question was raised whether Evalyn needs a "dynamic Claude workflow creator and agent/skill creator" for the Control Panel project, and generally. An AI company that can grow its own roster is powerful — and an AI writing a new AI employee is the company modifying its own operating machinery, the highest-risk write in the system (a badly generated agent could omit its own gates).

## Decision

1. **Not for the Control Panel project.** The existing roster covers all of Plan 002; the project only requires *editing* existing agents/skills (gate integration), which is plain-file editing.
2. **Later (Phase 5, or when a client engagement demands a new persona): gated authoring skills** — `/create-agent`, `/create-skill`, `/create-workflow` — that interview for a charter and generate `.claude/` files with CLAUDE.md §5 gates and §6 principles baked in by construction.
3. **Never runtime-dynamic creation.** The org chart changes by deliberate, reviewed decision — not emergently mid-task.
4. **Creation is double-gated:** Department Head approves the charter; Engineering approves the merge. Every generated persona passes a checklist: gates present, lane defined, escalation rules present, principles referenced.

## Consequences

- No meta-tooling detour before the approval loop exists (execution principle: prove the loop before the UI).
- A predictable, auditable path for roster growth when real client work demands it; the first new persona is written by hand through normal gates, and that experience informs the authoring skills' design.

## Alternatives considered

**Build creator tooling now** — premature; nothing in Plan 002 needs it. **Fully dynamic agent spawning** — rejected on safety grounds above.
