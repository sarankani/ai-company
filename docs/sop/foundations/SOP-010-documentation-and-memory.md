# SOP-010 — Documentation & Memory: the company's long-term mind

| | |
|---|---|
| **Applies to** | All AI employees |
| **Owner** | `tech-writer` (content) · Founder/CEO approval |
| **Status** | Active |
| **Version** | 1.0 (2026-07-15) |

## Standard

An AI company's institutional memory cannot live in anyone's head — every session starts amnesiac. So the docs **are** the institution: plans say what we're doing, specs say what we're building, ADRs say what we decided and can't easily undo, memory says what's currently true. Nothing significant starts without a plan; nothing hard-to-reverse happens without an ADR; nothing durable is learned without a memory write.

## 1. The four stores and when each is written

| Store | Holds | Written when | Lifecycle |
|---|---|---|---|
| `docs/plans/` | Numbered plans for significant changes | Before the work starts | `Draft → Approved → Done`; the active board (`002-execution-plan.md`) tracks task state |
| `docs/specs/` | PRDs & tech specs | Before implementation | Human-approved before build |
| `docs/adrs/` | Hard-to-reverse decisions | When the decision is made | AI proposes, human accepts; **supersede, never rewrite** |
| `memory/` | Cross-session state: `company-context.md` (snapshot, edit in place) · `decisions-log.md` (append-only) · `glossary.md` | Session start = read; session end = write (SOP-001) | Snapshot stays current; log never edited |

Runbooks (`docs/runbooks/`) hold repeatable operational procedures — deploys, drills, acceptance tests; SOPs (`docs/sop/`) hold how roles operate (change control in SOP-000).

## 2. Decision hygiene

- A decision that constrains future work gets written where the future will look: ADR if hard-to-reverse, decisions-log otherwise. "We discussed it in a session" is not a record.
- Every decision entry names: date, what was decided, who approved, and the link (record/PR/APR).
- Superseding: new ADR references the old; the old gets a `Superseded by` header. History stays readable.
- Precedence when documents conflict: **ADRs > CLAUDE.md > SOP foundations > role SOPs > guides/skills** — and the conflict itself gets fixed the same day it's found.

## 3. Documentation quality bar (all docs)

- Grounded in the actual system — commands that run, paths that exist, numbers with provenance; unknowns marked `TBD` (SOP-008).
- Written for the reader who wasn't there: no session shorthand, ids explained or linked.
- Every doc has an owner and a status; a doc nobody owns is deleted or adopted, not left to rot.
- Update the doc **in the same change** that makes it wrong — a PR that changes behavior ships with its doc updates.

## 4. Anti-patterns

- Never start significant work without a plan doc ("significant" = multi-session, cross-role, or externally visible).
- Never edit an accepted ADR's decision text — supersede it.
- Never let `memory/company-context.md` describe last month; stale memory is worse than none because it's trusted.
- Never duplicate a fact across docs when a link would do (SOP-000 principle 4).

---
*Changelog: 1.0 — initial.*
