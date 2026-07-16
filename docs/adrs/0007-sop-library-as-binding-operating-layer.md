# ADR-0007 — The SOP library as the binding operating layer

- **Status:** Proposed — awaiting Saran
- **Source:** `docs/sop/` shipped to main (staged via PR #67 → `sop`, merged via PR #69, 2026-07-15). This ADR ratifies the convention already in use.

## Context

`CLAUDE.md` is the company's operating brain, but it is deliberately compact — it cannot carry the executable, role-by-role detail an AI employee needs to do its job correctly without asking how the company works. That detail was previously scattered across agent charters and the `guides/`, where it drifted and duplicated. The `docs/sop/` library was introduced to hold it in one place: foundations SOP-000…014 that apply to every employee, plus one role SOP per employee (SOP-Rxx), each following a mandatory five-part standard. The library is already live on main and every agent charter loads it at session start; what is missing is a durable, human-ratified record of its authority and its relationship to the existing decision layers.

## Decision

The **SOP library (`docs/sop/`) is the binding operating layer** of the company.

- **Binding on all employees.** The foundations (SOP-000…014) apply to every AI employee and human seat-holder; each employee is additionally bound by its own role SOP. Every agent charter loads the foundations plus its role SOP at session start (SOP-001).
- **Five-part standard.** Every operational SOP carries, explicitly: Purpose & Scope · Roles & Responsibilities (RACI) · Step-by-Step Instructions · Exceptions & Red Flags · KPIs & Metrics (SOP-000 §2a). This makes procedures executable and auditable rather than aspirational.
- **Precedence.** On conflict the order is **ADRs > CLAUDE.md > foundations > role SOPs > guides**. SOPs bind concrete mechanics (paths, commands, record formats) to universal best practice; when tooling changes, only the binding changes.
- **Relationship to CLAUDE.md and the ADRs.** CLAUDE.md remains the top-level brain and the ADRs remain the record of hard-to-reverse decisions; the SOPs neither restate nor override them — they operationalize them. An SOP may never weaken a gate, an SLA, or the ADR-0004 invariant (escalation reassigns, never approves); such a change requires a superseding ADR first (SOP-000 §5).
- **Change control.** SOPs are superseded, never silently rewritten, for material changes. Changes to foundations or to gate/escalation behavior route as a `merge-deploy` action and additionally need the Founder/CEO's stamp; role-SOP changes need the owning department's Approver.
- **Already live.** This ADR ratifies a convention already in production; it does not introduce new behavior, it records and authorizes the existing one.

## Consequences

- Operating knowledge has one authoritative home; charters and guides stop duplicating (and drifting from) it. The `guides/` become narrative overviews that point at the SOPs for binding detail.
- A new employee is productive from its role SOP + foundations alone, without re-deriving how the company works.
- Costs: the library must be maintained under change control, and the precedence order must be honored everywhere — a stale count or contradicted rule in CLAUDE.md, an ADR, or a guide is now a defect against a named source of truth.
- SOP edits touching gates/SLAs are sensitive and gated, which slows those specific changes by design.

## Alternatives considered

**Keep operating detail in agent charters and guides only** — simplest, but that is the drift-and-duplication problem this replaces; charters cannot be audited or version-controlled as procedures. **Fold the SOP detail into CLAUDE.md** — would bloat the always-loaded brain past what fits in context and mix compact policy with per-role procedure. **Treat SOPs as non-binding guidance** — removes the whole point: unenforced procedure is a poster, not an operating layer.
