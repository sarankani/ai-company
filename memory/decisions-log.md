# Decisions log (operational)

Append-only, newest first. Format: `## YYYY-MM-DD — decision` + who + why in 1–3 lines. Architectural decisions go to `docs/adrs/` instead.

## 2026-07-13 — PHASE 0 COMPLETE — PR #33 merged (Founder sign-off)

**Who:** Founder (merged) / delivery-manager (verified DoD). Exit criteria all met: specs+ADRs approved (PR #1), CLAUDE.md on the distributed model, `company/org/` live with two humans seated, dry-run 9/9. Epic #2 and issues #7–#9 closed. Phase 1 (E1, #3) unblocked — first task EX-101 (#10).

## 2026-07-13 — First seat handover: Saravanan P becomes Approver for 3 departments

**Who:** Founder (directed = people-gate approval). New human `saravanan-p` (Saravanan P — saravanan@vitetech.in) holds the **Approver** seat for `engineering`, `product-design`, `operations`. Founder record renamed to full name (Saravanan Pitchaikani), remains Deputy + Head in those departments, all other seats, and CEO backstop. Note: saranpkani@gmail.com was given as "saravanan Pitchaikani" — same email as the founder record, so treated as the founder's full name, not a new human (1:1 email↔human required by panel auth).

## 2026-07-13 — EX-008 paper dry-run PASSED (9/9) — Phase 0 exit criteria met pending Founder sign-off

**Who:** tester (executed) / Founder (directed via issue #2). Every case resolved using only `company/org/` files (departments.md + humans/saran.md + routing.md):

| # | Case (gate, priority) | Resolved dept | Assignee | SLA due | Chain | Result |
|---|---|---|---|---|---|---|
| 1 | developer PR ready — `merge-deploy`, P1 | engineering | saran (approver, available) | +1 business day | approver→deputy→head→ceo | ✅ |
| 2a | marketing publish — `external-comms`, P1 | marketing-support | saran | +1 bd | same | ✅ |
| 2b | proposal send to customer — `external-comms` special rule | **sales-delivery** (customer-specific) | saran | +1 bd | same | ✅ |
| 3 | invoice send — `money`, P1 | people-finance | saran | +1 bd | same | ✅ |
| 4a | delivery-date commit — `commitments`, P1 | sales-delivery | saran | +1 bd | same | ✅ |
| 4b | roadmap promise — `commitments` special rule | **product-design** | saran | +1 bd | same | ✅ |
| 5 | job offer — `people`, P1 (**dual**) | people-finance **+ ceo stamp** | saran ×2 distinct stamps required on the record | +1 bd | same | ✅ |
| 6 | outbound PO — `procurement`, P1 | operations | saran | +1 bd | same | ✅ |
| 7 | milestone acceptance — `revenue-booking`, P1 | people-finance | saran | +1 bd | same | ✅ |
| 8 | prod incident fix — `merge-deploy`, **P0** | engineering | saran | +2 h wall-clock, escalate hourly | same | ✅ |
| 9 | approver `ooo` — unavailability skip | any | chain collapses to **ceo (saran)** at n=1 — item stays assigned, never dropped, never auto-resolved | per priority | terminal backstop | ✅ |

Notes: (a) at n=1 every hop lands on the same human — expected; the mechanism is exercised, the value arrives with hires (EX-305/306). (b) Dual-approval on `people` still demands two stamps even when one human holds both seats — keeps the record shape stable for when it's two people. (c) No config defects found; no EX-007 rework needed. **Phase 0 definition of done met** — awaiting Founder sign-off on the E0 PR to close #7/#8/#9 and unblock EX-101 (#10).

## 2026-07-13 — Backlog created: Spec 002, Plan 003, 5 epics + 26 issues on GitHub

**Who:** Founder (requested) / product-manager+solutions-architect lens (executed). One consolidated all-phases spec (spec-002), detailed task document (plan 003, 10-section format), epics #2–#6 and tasks #7–#32 with native sub-issue links and blocked-by/blocks relationships. Issue format standard set: user story, use cases, acceptance criteria, out of scope, technical notes, related documents.

## 2026-07-12 — Documentation & memory structure adopted

**Who:** Saran (requested) / tech-writer (executed). Plans in `docs/plans/`, specs in `docs/specs/`, ADRs in `docs/adrs/`, durable memory in `/memory`. Wired into CLAUDE.md §3.

## 2026-07-12 — Plan 001 direction approved; execution started

**Who:** Saran. Distributed approval model + Control Panel confirmed as the way forward ("good, based on your plan and execute approach"). Plan 002 execution board created; Phase 0 tasks EX-002…EX-005 drafted same day, EX-006/007/008 pending spec sign-off.

## 2026-07-12 — Evalyn branding and identity set

**Who:** Saran (requested). CLAUDE.md §0 filled (company = Evalyn, AI-run IT services, minimum-human design); README rewritten. ICP, rate card, OKRs, regions left `TBD` — only Saran can set these.
