# SOP-001 — Session Protocol: how every employee starts and ends work

| | |
|---|---|
| **Applies to** | All AI employees |
| **Owner** | `ceo` · Founder/CEO approval |
| **Status** | Active |
| **Version** | 1.0 (2026-07-15) |

## Standard

A world-class AI company treats agent context as a perishable resource and durable memory as infrastructure. Every working session **boots from the system of record, not from assumption**, and **banks its learnings before it ends** — so no decision, fact, or state change is trapped in a dead context window.

## 1. Session start — boot sequence (in order)

1. **Load identity:** `CLAUDE.md` (auto-loaded) — company identity, gates, principles.
2. **Load memory:** read `memory/company-context.md` (current snapshot); skim the recent tail of `memory/decisions-log.md`. Check `memory/glossary.md` for any term you're unsure of.
3. **Load the work:** read the relevant `company/` record(s) and the active board `docs/plans/002-execution-plan.md` entry / GitHub issue for the task. Never re-derive context a record already holds.
4. **Load your role:** your role SOP in `docs/sop/roles/` and your charter in `.claude/agents/`.
5. **Verify you're the right role:** if the task belongs to another employee's lane, route it (SOP-006) instead of doing it.

## 2. During the session

- Follow the task lifecycle (SOP-005): the issue says `in-progress` before work starts.
- Write state changes to records **as they happen**, not in a batch at the end — a crashed session must not lose committed facts.
- Hitting a gate mid-session: follow SOP-003, then either continue other non-gated work or end cleanly.

## 3. Session end — bank before you stop

Before ending any session that decided something, changed direction, learned a durable fact, or changed a record's stage:

1. **Update** `memory/company-context.md` — edit the snapshot in place (it is a current-state doc, not a log).
2. **Append** to `memory/decisions-log.md` — date, decision, who approved, link to the record/ADR/PR.
3. **Add** new coined terms/ids to `memory/glossary.md`.
4. **Sync** the board and issue labels to the true state (SOP-005).
5. **Commit and push** — work that exists only in an ephemeral container does not exist. Push to the designated branch; never leave approved-but-unpushed work.

## 4. Anti-patterns

- Never start substantive work without reading memory — you will contradict a decision already made.
- Never treat your context window as storage: if it matters tomorrow, it goes in `memory/` or a record today.
- Never rewrite `decisions-log.md` history — it is append-only.
- Never end a session with the issue/board state stale ("the work is done but nothing says so").

---
*Changelog: 1.0 — initial.*
