# ADR-0004 — SLA expiry escalates; silence never equals consent

- **Status:** Proposed — awaiting Saran
- **Source:** Plan 001 A3/A5

## Context

With SLA timers on every approval, something must happen when a timer expires. Some workflow systems auto-approve or auto-close stale requests to keep throughput up. Evalyn's gates exist precisely because these actions are irreversible or external-facing.

## Decision

SLA expiry **only ever reassigns** the item to the next human in the escalation chain. There is no auto-approve, no auto-reject, no expiry state, under any load, at any priority. The state machine has no transition out of `pending` that isn't a named human's explicit decision (or the requester's withdrawal).

## Consequences

- The safety spine (CLAUDE.md §5) survives the move to distributed approvers: an unstaffed week produces a backlog in the CEO queue — never an unapproved external action.
- Cost: genuine urgency requires a human; P0 SLAs and notification quality must be good enough that one is reachable. Throughput pressure is answered by staffing (Plan 002 EX-305) or SLA tuning — never by weakening this rule.

## Alternatives considered

**Auto-approve low-risk gates on timeout** — rejected: "low-risk" drift is exactly how gate erosion starts, and rubber-stamp-by-timeout is indistinguishable from no gate. **Auto-reject on timeout** — rejected: destroys AI work invisibly and teaches employees to re-spam requests.
