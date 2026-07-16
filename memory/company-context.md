# Company context — snapshot

*Last updated: 2026-07-16*

## Who

- **Saravanan Pitchaikani** (saranpkani@gmail.com) — Founder / CEO / Human Operator. Holds all seats except three handed-over Approver seats; CEO terminal backstop.
- **Saravanan P** (saravanan@vitetech.in) — Approver: Engineering, Product & Design, Operations (first non-founder seat-holder, 2026-07-13).
- 24 AI employees per `CLAUDE.md` §2 (chief-of-staff dispatcher added 2026-07-15).

## Direction (what changed recently)

- **2026-07-12:** Evalyn's operating model is moving from *one-human-at-all-gates* to **distributed per-department human approvers** with a delegation/escalation chain (approver → deputy → head → CEO) and SLA-based routing. Saran approved this direction; mechanism details are in Plan 001 and ADR-0003/0004.
- Hard invariant confirmed: **SLA expiry escalates, never auto-approves** (ADR-0004).
- Meta-tooling (agent/skill/workflow creators): deferred to Phase 5, as gated authoring skills only (ADR-0006).

## Current focus

- **Active project:** Approval Loop & Control Panel. Board: `docs/plans/002-execution-plan.md`. **Phases 0–1 DONE (PR #1/#33/#34/#35 + drills, 2026-07-14). The approval loop is proven end to end in production. Next: Phase 2 — Control Panel MVP (E2, #4); every E2 merge goes through the loop.**
- **Done:** PR #1 (specs+ADRs) and PR #33 (E0: CLAUDE.md model, company/org/, dry-run 9/9, first seat handover to Saravanan P) both merged 2026-07-13. Issues #7–#9 closed; Epic #2 closed.
- **Branch:** `claude/evalyn-ai-setup-oocv7m`, restarted from main after PR #33.

## Still TBD in company identity (CLAUDE.md §0)

ICP · rate card / margin floor · quarterly OKRs · regions & compliance. Sales/pricing employees output `TBD` pricing until set.

## Where things live

Plans `docs/plans/` · specs `docs/specs/` · ADRs `docs/adrs/` · memory here · business records `company/` (org/ + registry live; approvals/ comes with EX-101) · **SOPs `docs/sop/`** — live on main (foundations SOP-000…014 + role SOPs for all 24 AI employees + human seats; agents load foundations + their role SOP; precedence ADRs > CLAUDE.md > foundations > role SOPs > guides). Staged via PR #67 → the `sop` branch, merged to main via PR #69; the `sop` branch was a one-time staging step, not an ongoing convention.
