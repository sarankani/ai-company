# Plan 006 — Roles & Designations framework

- **Status:** Draft — proposed 2026-07-19; awaiting Saran's approval. Charters + catalog built on `claude/org-roles-designations`; departments.md/routing changes are a **gated org change** (Head proposes, CEO approves — Plan 001 risk #5), which this plan's approval satisfies.
- **Owner:** chief-of-staff (org mapping) · hr (roles/ladder) · ceo + Saran (gate: departments.md change)
- **Related:** `company/org/designations.md` (the catalog) · `company/org/departments.md` · `company/org/routing.md` · `CLAUDE.md` §0/§2 · `.claude/agents/` · ADR-0003 (distributed approvers) · Plan 001 D1.5 (seat handover / scaling)

## 1. Why

Evalyn runs on **24 archetype agents** but a real IT services company hires against a much richer org chart — 15 functions, ~120 designations across seniority ladders (VP → Intern) and specializations (Frontend/Backend/Mobile/Platform, etc.). Saran supplied that full org chart and asked us to maintain the company against it.

Two problems to solve without breaking the minimum-resources model:
1. **No shared vocabulary** between "the org chart a human thinks in" (CFO, Staff Engineer, DPO) and "the agents that do the work" (`finance`, `developer`). Nothing said *which archetype operates as which designation*, or *what seniority means* when one agent covers a whole ladder.
2. **Structural gaps** — three functions in the org chart map to **no agent at all**: Data & AI *build* (ML/MLOps/Data Engineering), IT & Admin (internal IT/workplace), and Legal & Compliance (contracts/DPO/SOC2-ISO-DPDP). Work in those lanes had no owner.

Saran's decision (2026-07-19): **catalog + close the structural gaps** — map every designation onto the archetypes, and stand up new archetype agents only for the functions that map to nobody (not one-agent-per-title, which would break the model).

## 2. Goal & definition of done

- A canonical **`company/org/designations.md`** maps all ~120 designations → the archetype agent that operates as each, with the seniority/specialization model made explicit and a visible gap list.
- **Three new archetype agents** close the structural gaps, each in the house charter style (incl. the process-aware "pipeline you drive" section) and each wired into `departments.md` and `CLAUDE.md`:
  - **`ml-engineer`** → `engineering` — data pipelines, model training/eval, MLOps (Data & AI build).
  - **`it-admin`** → `operations` — internal IT, accounts/access, workplace & admin.
  - **`legal-counsel`** → `operations` — contract review, obligations, compliance program (SOC2/ISO/DPDP-GDPR). **Prepares only; binding advice & signature stay human.**
- Docs are consistent: the employee count moves **24 → 27** in `CLAUDE.md`, `README.md`, `guides/operating-model.md`, `guides/getting-started.md`, `memory/company-context.md`, with the three agents in each roster.
- Human-in-the-loop gates are **unchanged** — the new agents draft/prepare/recommend exactly like their peers; no new gate authority is created.

**Done when:** the catalog is merged, the three agents exist and appear in the org records, `/visualize-agents` renders the 27-agent org from the actual files, and the doc count is consistent across the operating docs.

## 3. Design decisions

- **One agent = a role family, not a title.** Seniority (Principal → Intern) is the *same* agent operating with more/less autonomy and blast radius — gates identical, scope different. Specialization (Frontend/Backend/Mobile) is the *task context*, not a separate agent. This keeps the roster small and the model intact.
- **C-suite/VP authority stays with human seats.** An agent may *operate as* "CFO" to prepare work; the CFO **decision** is a human gate per `routing.md`. The catalog's Executive table makes the prepares-vs-decides split explicit.
- **New-agent placement:** `ml-engineer` is *delivery* → Engineering; `it-admin` and `legal-counsel` are *corporate/back-office* → Operations (the enabling cluster, alongside procurement/data-analyst). Security's compliance *controls* stay with `security`; the *program/evidence* is `legal-counsel` — they coordinate.
- **No new gate types.** Legal signature routes through the existing `money`/`commitments` gates + CEO (legally-binding); access grants (it-admin) route through the existing model with `security`. A dedicated `legal` gate is deliberately **not** added now — flagged as a possible future ADR if legal volume warrants it.

## 4. What this plan does NOT do (scope guard)

- **No one-agent-per-designation** (~120 files) — rejected as breaking the minimum-resources archetype model.
- **RevOps / UX-Research / Product-Marketing** stay mapped to existing archetypes; listed in the catalog as the next candidate agents if they thin.

## 4a. Full doc & diagram sweep (added 2026-07-19, per Founder — "update all necessary documents and diagrams")

The initially-deferred items were pulled into this same change so the 27-agent org is consistent everywhere:

- **Role SOPs authored** for all three new agents — `docs/sop/roles/ml-engineer.md` (SOP-R25), `it-admin.md` (R26), `legal-counsel.md` (R27) — full template (5 mandatory parts + §7.1 role-flow Mermaid diagram), indexed in the SOP README (count 23 → 27).
- **All four company-wide diagrams regenerated** — `docs/org/agent-map-{org,gates,value-chain,workflows}.md`: `ml-engineer` in the engineering subgraph + deliver stage + merge-deploy gate; `it-admin`/`legal-counsel` in the operations subgraph; gate table, workflow-coverage note, and the org-map count/drift note all updated to 27.
- **Marketing snapshots refreshed** — `company/marketing/social-*` counts 24 → 27; the founder-approved AGI posts carry a note that the figure changed after the 2026-07-16 approval, so a human re-confirms before publishing (nothing published autonomously).
- **Memory updated** — `memory/company-context.md` (roster 27, designations pointer) + a `decisions-log.md` entry.

## 5. Follow-ups

1. Human-seat SOP coverage for the new lanes (IT/Legal) if/when those seats are hired (Plan 001 D1.5).
2. Revisit a dedicated `legal` gate (ADR) if contract/compliance volume grows.
3. Workflow coverage: candidate steps for `ml-engineer` (project-kickoff/delivery-to-invoice for AI projects), `legal-counsel` (contract review in opportunity-to-proposal), `it-admin` (IT onboarding in hiring-pipeline) — see `agent-map-workflows.md`.
4. Pre-existing, separate: `guides/getting-started.md` skill count reads "16 role skills" (actual 27) — a skill-count drift unrelated to the roster.
5. As hiring begins (Plan 001 D1.5), the designation ladder here is what human hires fill — seat handover stays department-by-department.
