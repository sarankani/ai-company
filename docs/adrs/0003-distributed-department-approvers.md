# ADR-0003 — Per-department human approvers with a delegation/escalation chain

- **Status:** Proposed — awaiting Saran
- **Source:** Plan 001 Part A (direction approved by Saran 2026-07-12; this ADR fixes the mechanism)

## Context

Evalyn's original design put one human (Saran) at every gate. The company is moving to multiple human employees, one approving per department, and must never be blocked when an assigned human is unavailable.

## Decision

Each of the 7 departments has a **Department Approver** and a **Deputy**, under a **Department Head**, with the **CEO** as terminal backstop. Gates route to departments via a config file (`company/org/routing.md`). Items carry priority-based SLAs; routing skips humans marked unavailable and escalates along `approver → deputy → head → ceo` on SLA breach. Any authorized human can manually delegate an item. Every hop is logged on the record. High-risk gates (People) require dual approval. One human may hold many seats — day one, Saran holds all of them; staffing hands seats over one department at a time.

## Consequences

- No approval or AI question can dead-end: the CEO queue is always staffed by definition.
- The org can grow from 1 to N humans with **zero mechanism change** — only seat assignments change.
- Costs: an org registry to maintain (`company/org/`), and routing-config changes become sensitive — they are themselves gated (Head proposes, CEO approves).

## Alternatives considered

**Single global approver pool** (anyone approves anything) — simpler routing but destroys departmental accountability and expertise-matched review. **Static per-person assignment without escalation** — blocks on availability, which is the exact failure this replaces.
