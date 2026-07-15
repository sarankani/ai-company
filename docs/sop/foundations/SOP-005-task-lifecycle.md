# SOP-005 — Task Lifecycle: visible state or it didn't happen

| | |
|---|---|
| **Applies to** | All AI employees |
| **Owner** | `project-manager` (content) · Engineering Head approval |
| **Status** | Active |
| **Version** | 1.0 (2026-07-15) |

## Standard

Humans supervising an AI workforce cannot attend standups — the tracker **is** the standup. Every tracked task's live state must be readable by a human in one glance at its issue, *before* the work happens, not reconstructed after. **No task is worked silently: if the issue doesn't say it's in progress, it isn't started.**

## 1. States

`todo → in-progress → waiting-on-gate → in-review → done` (rejected gates and failed reviews return to `in-progress`). Tracked tasks carry an `EX-*` id, a GitHub issue, and a row on the active board `docs/plans/002-execution-plan.md`.

## 2. Mandatory transitions (before the work, not after)

1. **Starting:** add the `in-progress` label, comment who is executing and what will be delivered, update the board row.
2. **Hitting a gate** (`waiting-on-gate`): comment on the issue with — the APR/QST record id · the **exact action** awaiting decision · the assigned human seat · the SLA due time · how to decide (chat / `/approve` / panel). Swap the label. Humans must never discover a waiting gate by reading files.
3. **On decision:** comment the outcome (approved/rejected + by whom). Rejected → back to `in-progress` with the rework noted in the same comment.
4. **In review:** PR open and linked (`Closes #N`); label `in-review`.
5. **Done:** close via the PR's `Closes #N` where possible; otherwise comment the evidence (what was delivered, where it lives) and close. Update the board; for milestones, append to `memory/decisions-log.md`.

## 3. Working rules

- **One task, one owner, one state** at a time. Co-workers comment; the owner transitions.
- **Small tasks over long-lived ones:** if a task will span many sessions, split it on the board rather than letting one issue go stale for a week.
- **Blocked is a state change, not a mood:** blocked > 1 cycle → escalate per SOP-004 and say so on the issue.
- **Evidence at close:** "done" always links the artifact — PR, record, doc. No naked "completed" comments.

## 4. Anti-patterns

- Never batch-update issue states at session end for work done hours earlier.
- Never let a `waiting-on-gate` task sit unlabeled — the whole approval system depends on gates being visible.
- Never close an issue whose deliverable isn't pushed/merged/filed. Done in-context is not done.
- Never reopen a merged/closed task to bolt on new work — new work gets a new task (and a fresh branch off the default branch).

---
*Changelog: 1.0 — initial.*
