# Company context — snapshot

*Last updated: 2026-07-13*

## Who

- **Saran** (saranpkani@gmail.com) — Founder / Human Operator. Currently holds **every approval seat** in every department (the n=1 case of the distributed model). All gates route to him until seats are staffed.
- 23 AI employees per `CLAUDE.md` §2; no other humans yet.

## Direction (what changed recently)

- **2026-07-12:** Evalyn's operating model is moving from *one-human-at-all-gates* to **distributed per-department human approvers** with a delegation/escalation chain (approver → deputy → head → CEO) and SLA-based routing. Saran approved this direction; mechanism details are in Plan 001 and ADR-0003/0004.
- Hard invariant confirmed: **SLA expiry escalates, never auto-approves** (ADR-0004).
- Meta-tooling (agent/skill/workflow creators): deferred to Phase 5, as gated authoring skills only (ADR-0006).

## Current focus

- **Active project:** Approval Loop & Control Panel — Evalyn's first internal project, run through its own value chain. Board: `docs/plans/002-execution-plan.md` (Phase 0 in progress).
- **Done:** PR #1 merged 2026-07-13 (specs+ADRs accepted). EX-006/007/008 executed on the branch — awaiting the E0 review to close #7–#9 and unblock EX-101 (#10).
- **Branch:** work happens on `claude/evalyn-ai-setup-oocv7m`; no PR opened yet (Saran hasn't asked for one).

## Still TBD in company identity (CLAUDE.md §0)

ICP · rate card / margin floor · quarterly OKRs · regions & compliance. Sales/pricing employees output `TBD` pricing until set.

## Where things live

Plans `docs/plans/` · specs `docs/specs/` · ADRs `docs/adrs/` · memory here · business records `company/` (not yet created — comes with EX-007/EX-101).
