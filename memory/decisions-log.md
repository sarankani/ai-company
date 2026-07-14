# Decisions log (operational)

Append-only, newest first. Format: `## YYYY-MM-DD — decision` + who + why in 1–3 lines. Architectural decisions go to `docs/adrs/` instead.

## 2026-07-14 — EX-205 SHIPPED (PR #42): availability + gated seat changes; Admin live

**Who:** saran (approved in-channel by merging PR #42) / devops (completion stamp). One-tap availability (commits to registry, routing skips next scan) and /admin two-step seat changes (Head proposes → dual approval → CEO applies exactly-once) are in main. Gate APR-20260714-006 closed approved+executed. EX-206 (security review + fixes) pushed immediately after as its own PR.

## 2026-07-14 — EX-206 security review done: 2 High + 4 Med + 3 Low, all fixed

**Who:** security (review) / developer (fixes). Full panel audit (report: `docs/specs/security-review-001-control-panel.md`). Ship-blockers found and fixed: **H1** `artifact` path traversal → local file read + a People-gate read bypass (a visible record naming a People-gate record as its artifact rendered its body) — fixed with a repo-path containment guard + allowlist + `canView` re-check on artifacts that are records; **H2** magic links logged as bearer credentials even with SMTP set — logging gated, SMTP delivery + single-use tokens flagged as EX-207 preconditions. Also: **M4** People-gate seat-changes leaked to any Head (now `canView`-filtered), **M5** open redirect via `return=` (now same-origin only), **M6** Next 15.1.6 CVE-2025-29927 (→15.5.20), **L8/L9** input validation. **Policy calls resolved by Founder (2026-07-14):** (M3) **graduated** separation of duties — n=1 same-human co-sign stays, distinct humans auto-required on the 2nd qualified hire; (H2) **accept** the 15-minute magic-link replay window as a documented residual (no state store — keeps ADR-0002 statelessness). Applied to BOTH engines (TS + Python) for lockstep. 26 Python tests + 42 e2e checks green. Held locally behind PR #42's gate.

## 2026-07-14 — EX-204 SHIPPED (PR #41): company-wide visibility from records

**Who:** saran (approved in-channel by merging PR #41) / devops (completion stamp). Dashboard (7 live department tiles + CEO escalation strip) and Department Boards (state groups, composable filters) are in main — G3 visibility now exists as screens, computed straight from records, people-gate work absent for unauthorized seats. Gate APR-20260714-005 closed approved+executed. EX-205 (built & verified while #41 waited, per the autonomy directive) pushed immediately after — the between-gates pipelining worked as designed on its first use.

## 2026-07-14 — Founder directive: proceed autonomously between gates

**Who:** Founder (in chat): "no need to wait for me — if any task is waiting-on-gate then wait, otherwise start working on it; you can choose what next to be done." Operating change: the AI picks and executes the next task without asking, following the Plan 002 board order and dependencies; the ONLY stopping points are human gates (unchanged, ADR-0003/0004). Task lifecycle protocol still applies in full — issues flip to in-progress/waiting-on-gate with comments before work moves.

## 2026-07-14 — EX-203 SHIPPED (PR #40): the panel decides — approvals are now a web click away

**Who:** saran (approved in-channel by merging PR #40) / devops (completion stamp). The Control Panel's decide surface is live in main: Item Detail with approve/reject-with-reason/delegate/answer/follow-up, every decision = one commit (stamp + registry + `Decided-by` trailer) through a TS engine kept in lockstep with the Python engine — the e2e suite proves the Python validator accepts panel-written records. 30/30 Playwright checks in a real browser (authz, people-gate visibility, dual-approval two-stamp sequence, optimistic-concurrency rejection, QST answers). Gate APR-20260714-004 closed approved+executed. **Non-technical humans can now decide without git or CLI — the EX-208 acceptance criterion is within reach.** Next: EX-204 (Dashboard+Board) and EX-205 (availability+admin), both unblocked.

## 2026-07-14 — PR #39 merged (gate APR-20260714-003 closed) + third CRLF finding: artifact_sha now checkout-independent

**Who:** saravanan-p (decide via CLI + merged PR #39 himself) / devops (completion stamp). The exactly-once guard then blocked the executor's claim: the approver's decide ran on a Windows checkout, so `artifact_sha` hashed CRLF bytes (c484affc…) while main's LF content hashes bba186a9… — same logical file, different sha (proven byte-for-byte: CRLF-converting main's file reproduces the approved sha exactly). Fix: `artifact_sha` normalizes CRLF/BOM before hashing, regression-tested; the record's approved_artifact_sha corrected with the proof in its Thread. Third bug of the CRLF family (parser regex, panel parser, now the hash) — any byte-level comparison in this system must normalize line endings first. Both open gates are now closed; registry open-items table is empty.

## 2026-07-14 — Parser bug #2 (quote-unaware split_top) fixed; APR-20260714-002 repaired; save() roundtrip guard added

**Who:** developer (fix) / Founder (reported the CI failure). Second corruption of the same class as the EX-107 drill finding: `split_top` split inline dicts on commas *inside quoted values*, so a long decide reason mangled the saran stamp on APR-20260714-002; a git merge of two decision writes (saravanan-p's late-pushed CLI decide + the in-channel saran stamp) then duplicated sections → CI "list item outside list". Fixed in both parsers (Python engine + TS panel port), record repaired (both stamps kept, decision = saravanan-p's — first decision by the assigned seat), 2 regression tests added. **New invariant:** `save()` refuses to write any record whose dump doesn't parse back to identical text and keys — corruption now fails loudly at write time instead of landing on disk. Also found by the guard: empty strings dumped ambiguously as list-starts (now dumped as `""`). Process note: two decision channels racing on one record is what created the merge conflict — the executor should treat an already-decided record as terminal and skip re-stamping.

## 2026-07-14 — EX-201 approved by Saravanan P (first direct human engine decision); executor performed the merge

**Who:** saravanan-p (decision, via `decide` CLI himself — first non-founder, non-chat-mediated stamp) / devops (executor). APR-20260714-001: approved 07:14:49Z -> claimed -> PR #37 merged by the executor (cde768d) -> completed. The full resume loop — human approves, AI executes exactly once — ran with real role separation for the first time. Design brief 001 is final-for-build; §9 open questions unanswered -> designer recommendations stand as defaults (stay-on-item + Next button, deputy sees queue only on reassignment, 7-day sessions) unless overridden before EX-203.

## 2026-07-14 — PHASE 1 COMPLETE — escalation drill passed; the loop is proven end to end

**Who:** tester/data-analyst (verification) / saran (drill decisions). **EX-108:** APR-20260713-002 (P0) breached 2026-07-13T17:31Z; the scheduled job's first scan after the record reached main (dispatched 05:50:34Z) hopped it saravanan-p→saran autonomously (hop logged, chain_pos 0→1, new sla_due +1h cadence, registry updated by bot commit 0935f96) and the item stayed `pending` — ADR-0004 held in production. Rejected with reason "drill complete" (pre-authorized in the drill design). **EX-109 final baselines:** decision path 34m39s (EX-107, 2.4% of P1 SLA); escalation path: breach→hop latency = one scan cycle after visibility; gate volume to date: engineering 2, others 0 → hiring-order signal still needs Phase-3 trial data. **Known gap:** email sends pending SMTP secrets (job logs 'would send', retries until configured — by design, unsent ≠ sent). **E1 definition of done met in full.** Next: Phase 2 (Control Panel MVP, E2 #4), whose merges dogfood this loop.

## 2026-07-13 — EX-107 LIVE DRILL COMPLETE — first real approval through the loop (+2 bugs found & fixed)

**Who:** delivery-manager (drill) / saran (decision) / devops (executor). APR-20260713-001 ("Merge PR #34 into main"): created 14:54:50Z → routed engineering→saravanan-p → assigned-notification logged → approved by saran 15:29:29Z (via GitHub merge, in-channel rule) → claimed → executed exactly once 15:29:31Z. **Baseline metrics (EX-109, n=1): time-to-decision 34m39s (P1 SLA: 1bd — 2.4% used), hops 0, decision→execution 2s.**
**Drill findings (both fixed + regression-tested):** (1) frontmatter parser treated ' #' inside quoted values as a comment → crash on "PR #34" in a reason; (2) same bug via a pre-fix scan roundtrip truncated record 001's action field on disk — repaired, documented in the record's Thread. This is why we drill before building UI on top.
**EX-108 armed:** APR-20260713-002 (P0, 2h SLA, due 17:31:37Z) — deliberately undecided; the cron on main must hop it saravanan-p→saran and notify both. Reject it with reason 'drill complete' after the hop.

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
