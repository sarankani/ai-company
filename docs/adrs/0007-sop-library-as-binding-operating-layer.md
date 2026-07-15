# ADR-0007 — The SOP library is the binding operating layer

- **Status:** Proposed — awaiting Saran
- **Source:** SOP project (PR #67/#69, issues #68/#71); decisions-log 2026-07-15

## Context

Until 2026-07-15, how an employee operated lived in three uneven places: its charter (`.claude/agents/`), the narrative guides (`guides/`), and CLAUDE.md. Charters are terse, guides are background reading from the original pack, and neither carried step-by-step procedure, RACI, anomaly rules, or KPIs. As the roster and gate machinery matured, the gap showed: sessions improvised process (work without issues, chat approvals without records), and there was no single place a new employee — AI or human — could read to know exactly how the company runs.

The SOP library (`docs/sop/`) was built to close that gap: 15 foundation standards (SOP-000…014, including the AI-ops set — data ingestion & privacy, bias & fairness testing, HITL 30% rule, model deployment & rollback) and one five-part role SOP per employee, with every charter loading its SOP at session start. Making that layer *binding* — not advisory — is a governance decision that constrains every future session, so it belongs in an ADR.

## Decision

1. **The SOP library is binding on every employee, AI and human.** An employee that cannot follow its SOP escalates; it does not improvise around it (SOP-000 §6).
2. **Precedence on conflict:** ADRs > CLAUDE.md > SOP foundations > role SOPs > guides/skills. The guides are demoted to background reading; `docs/sop/` is the operating source of truth.
3. **Every operational SOP carries the five mandatory parts** (SOP-000 §2a): Purpose & Scope · RACI · Step-by-Step Instructions · Exceptions & Red Flags · KPIs & Metrics.
4. **Change control:** foundations or anything touching gate/escalation behavior needs the Founder/CEO stamp; role SOPs need the owning department's Approver; material changes supersede (version bump + changelog), never silently rewrite. **No SOP edit may weaken a gate, an SLA, or the ADR-0004 invariant — that requires a superseding ADR first.**
5. **Charters stay thin; SOPs carry the procedure.** The charter says what the role is and loads the SOP; the SOP says how it operates. Duplication between them is a defect (single-source rule, SOP-000 §2.4).

## Consequences

- Every session boots with the same operating law in context — process quality no longer depends on which session (or which model) is running.
- Deviations become detectable and correctable: the SOP names the rule, the decisions log records the miss (first instance: the SOP project itself, logged 2026-07-15).
- Docs must be kept in sync in the same change that alters behavior (SOP-010 §3) — this ADR's own PR carries the README/guides/glossary sync.
- Cost: SOP upkeep is real work with change control; stale SOPs are worse than none, so every SOP has an owner and the HITL sampling loop (SOP-013) doubles as the drift detector.

## Alternatives considered

**Keep charters as the only per-role truth** — too terse for procedure, RACI, and anomaly handling; bloating charters would load cost into every invocation. **Advisory (non-binding) SOPs** — rejected: advisory process documents rot into fiction; binding-with-escalation keeps them honest. **Per-department handbooks instead of per-role SOPs** — rejected: agents load per-role; a department doc forces every role to carry its siblings' procedure in context.
