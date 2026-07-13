# Plan 003 — Task Document & Issue Map

- **Status:** Active — the detailed task register behind [Plan 002](002-execution-plan.md); GitHub epics and issues are generated from this document and linked back below.
- **Derived from:** [Spec 002](../specs/spec-002-phased-implementation.md) · [PRD 001](../specs/prd-001-control-panel.md) · [Tech Spec 001](../specs/tech-spec-001-approval-loop-and-panel.md) · ADRs 0002–0006
- **Format:** every task entry carries — User story · Problem statement · Use cases · Acceptance criteria · Implementation · Out of scope · Technical notes · Tests · Definition of done · Related documents. GitHub issues mirror this (compact form) and add live relationships.
- **Linking conventions:** task ↔ epic via GitHub native sub-issues · dependencies as `Blocked by` (hard: cannot start until blocker closes) and `Blocks` (inverse, for navigation) · issues whose gate is "Founder approves" close only after that approval is recorded.

## Epics

| Epic | Phase | Exit criterion | Issue |
|---|---|---|---|
| E0 — Foundation & Org Definition | 0 | Sample gate routes correctly on paper; sign-off recorded | [#2](https://github.com/sarankani/ai-company/issues/2) |
| E1 — File-Based Approval Loop | 1 | Live drill + escalation drill pass | [#3](https://github.com/sarankani/ai-company/issues/3) |
| E2 — Control Panel MVP | 2 | Non-technical human approves without git, < 5 min | [#4](https://github.com/sarankani/ai-company/issues/4) |
| E3 — Routing Automation & First Hires | 3 | 2-week zero-breach trial; ≥1 non-founder approver | [#5](https://github.com/sarankani/ai-company/issues/5) |
| E4 — Scale-Up (trigger-based) | 4 | Dormant until the latency/concurrency trigger fires | [#6](https://github.com/sarankani/ai-company/issues/6) |

Completed pre-tracking (not re-issued): EX-001 plan approval · EX-002 PRD · EX-003 tech spec · EX-004 ADRs · EX-005 memory system.

## Task register (summary)

| ID | Task | Owner | Gate | Blocked by | Blocks | Issue |
|---|---|---|---|---|---|---|
| EX-006 | CLAUDE.md → distributed model | tech-writer | Founder | PR #1 sign-off | EX-007 | [#7](https://github.com/sarankani/ai-company/issues/7) |
| EX-007 | Create `company/org/` | hr + tech-writer | Founder | EX-006 | EX-008, EX-101 | [#8](https://github.com/sarankani/ai-company/issues/8) |
| EX-008 | Paper dry-run, 7 gate types | tester | — | EX-007 | EX-101 | [#9](https://github.com/sarankani/ai-company/issues/9) |
| EX-101 | Record templates + CI validation | developer | merge | EX-007, EX-008 | EX-102/103/105/106 | [#10](https://github.com/sarankani/ai-company/issues/10) |
| EX-102 | Gate integration across agents/skills | developer + tech-writer | merge | EX-101 | EX-107 | [#11](https://github.com/sarankani/ai-company/issues/11) |
| EX-103 | SLA/escalation job | developer | merge | EX-101 | EX-104, EX-108, EX-301 | [#12](https://github.com/sarankani/ai-company/issues/12) |
| EX-104 | Email notifications | developer + devops | merge (+procurement) | EX-103 | EX-107, EX-108, EX-303 | [#13](https://github.com/sarankani/ai-company/issues/13) |
| EX-105 | `/approve` helper skill | developer | merge | EX-101 | EX-107 | [#14](https://github.com/sarankani/ai-company/issues/14) |
| EX-106 | Exactly-once executor | developer | merge + security | EX-101 | EX-107 | [#15](https://github.com/sarankani/ai-company/issues/15) |
| EX-107 | Live drill | delivery-manager | Founder (the item) | EX-102/104/105/106 | EX-109, EX-201 | [#16](https://github.com/sarankani/ai-company/issues/16) |
| EX-108 | Escalation drill | tester | — | EX-103, EX-104 | EX-109 | [#17](https://github.com/sarankani/ai-company/issues/17) |
| EX-109 | Baseline metrics | data-analyst | — | EX-107, EX-108 | EX-305 | [#18](https://github.com/sarankani/ai-company/issues/18) |
| EX-201 | Panel design brief | designer | Founder | EX-107 | EX-202 | [#19](https://github.com/sarankani/ai-company/issues/19) |
| EX-202 | Scaffold + auth + read layer | developer | merge via loop | EX-201 | EX-203/204/205 | [#20](https://github.com/sarankani/ai-company/issues/20) |
| EX-203 | Inbox + Item Detail | developer | merge via loop | EX-202 | EX-206 | [#21](https://github.com/sarankani/ai-company/issues/21) |
| EX-204 | Dashboard + Board | developer | merge via loop | EX-202 | EX-206 | [#22](https://github.com/sarankani/ai-company/issues/22) |
| EX-205 | Availability + admin | developer | merge via loop | EX-202 | EX-206 | [#23](https://github.com/sarankani/ai-company/issues/23) |
| EX-206 | Panel security review | security | Founder accepts | EX-203/204/205 | EX-207 | [#24](https://github.com/sarankani/ai-company/issues/24) |
| EX-207 | Deploy | devops | Founder deploy gate | EX-206 | EX-208, EX-301/302/303 | [#25](https://github.com/sarankani/ai-company/issues/25) |
| EX-208 | Acceptance test | tester + delivery-manager | Founder accepts | EX-207 | E2 close | [#26](https://github.com/sarankani/ai-company/issues/26) |
| EX-301 | Auto-reassign on unavailability | developer | merge via loop | EX-103, EX-207 | EX-304 | [#27](https://github.com/sarankani/ai-company/issues/27) |
| EX-302 | Delegation UI + audit screen | developer | merge via loop | EX-207 | EX-304 | [#28](https://github.com/sarankani/ai-company/issues/28) |
| EX-303 | Slack notifications | developer + devops | merge via loop | EX-104, EX-207 | EX-304 | [#29](https://github.com/sarankani/ai-company/issues/29) |
| EX-304 | 2-week SLA trial | data-analyst | — | EX-301/302/303 | EX-306 | [#30](https://github.com/sarankani/ai-company/issues/30) |
| EX-305 | Hiring plan (first approvers) | hr | Founder (people gate) | EX-109 | EX-306 | [#31](https://github.com/sarankani/ai-company/issues/31) |
| EX-306 | Seat handover + first approver live | hr + tech-writer | Founder (people gate) | EX-304, EX-305 | E3 close | [#32](https://github.com/sarankani/ai-company/issues/32) |

---

## Detailed task entries

Template per task: **US** user story · **PS** problem statement · **UC** use cases · **AC** acceptance criteria · **IM** implementation · **OS** out of scope · **TN** technical notes · **TS** tests · **DoD** definition of done · **RD** related documents.

### EX-006 — CLAUDE.md → distributed model ([#7](https://github.com/sarankani/ai-company/issues/7))
- **US:** As an AI employee, I want CLAUDE.md to describe the distributed approver model so every session routes approvals to department seats, not one person.
- **PS:** CLAUDE.md §0/§5 still says one human holds every gate; employees act on a model the company has outgrown (Plan 001 risk #7).
- **UC:** agent hitting a gate reads §5 → seat model + SLA escalation · new session reads §0 → seats founder-held · human finds `company/org/` pointer.
- **AC:** no one-human wording remains; 7 gates ↔ departments per Plan 001 A2; §3b points to `company/org/`; Founder approves diff.
- **IM:** edit §0 approver block → seat model; add routing note to §5 (gates table untouched); update §3b.
- **OS:** changing the gates themselves; creating `company/org/` (EX-007).
- **TN:** owner `tech-writer`; gate Founder. Auto-loaded doc — highest-leverage text in the repo.
- **TS:** review-only (doc); dry-run EX-008 validates the described model end to end.
- **DoD:** merged with Founder approval; memory log updated.
- **RD:** Spec 002 P0-R1 · Plan 001 A · ADR-0003.

### EX-007 — Create `company/org/` ([#8](https://github.com/sarankani/ai-company/issues/8))
- **US:** As the routing engine and its consumers, I want complete org config so any gate resolves to an accountable, available human deterministically.
- **PS:** No machine-readable source exists for departments, seats, SLAs, or the escalation chain — nothing downstream can route.
- **UC:** gate → dept → available seat-holder → SLA due · SLA job reads chain · panel authorizes by seats · People gate requires dual stamps.
- **AC:** 7 gates resolve; 3 seats/department filled; schemas match Tech Spec 001 §2.1–2.3; routing.md self-declares gated changes; registry.md created; Founder approves.
- **IM:** `departments.md`, `humans/founder.md` (roles[], availability), `routing.md` (map, SLA table P0 2h/1h · P1 1bd · P2 3bd, chain, dual gates).
- **OS:** record templates (EX-101); executable code (EX-103); real hires (Phase 3).
- **TN:** owner `hr`+`tech-writer`; gate Founder (org config is gated).
- **TS:** EX-008 paper dry-run is this task's test.
- **DoD:** files merged; EX-008 unblocked.
- **RD:** Spec 002 P0-R2 · Tech Spec 001 §2 · Plan 001 A2/A3.

### EX-008 — Paper dry-run ([#9](https://github.com/sarankani/ai-company/issues/9))
- **US:** As the Founder, I want every gate type dry-run on paper so routing mistakes cost minutes, not a lost invoice.
- **PS:** Config is untested until exercised; a wrong mapping silently misroutes real work later.
- **UC:** 7 sample gates resolve dept/assignee/SLA/chain · People dual-approval shown · unavailability skip shown.
- **AC:** all cases documented; defects loop to EX-007; results in `memory/decisions-log.md`; Phase 0 exit recorded.
- **IM:** tabletop walk-through using only `company/org/` files; no code.
- **OS:** executing anything; code-level tests (EX-101).
- **TN:** owner `tester`; no gate — feeds Founder sign-off.
- **TS:** itself the test; expected mappings listed in issue #9.
- **DoD:** 7/7 pass; sign-off recorded.
- **RD:** Spec 002 P0-R3 · Plan 001 A3.

### EX-101 — Record templates + CI validation ([#10](https://github.com/sarankani/ai-company/issues/10))
- **US:** As an AI employee hitting a gate, I want a validated record format so what I write is guaranteed routable, auditable, executable.
- **PS:** A malformed record breaks routing silently — the loop's core data structure needs machine enforcement from day one.
- **UC:** agent writes APR with exact action → CI validates → registry lists · QST same path · malformed record rejected pre-merge.
- **AC:** frontmatter per Tech Spec 001 §2.4; state machine with **no expired state**; body sections; registry index; CI passes/fails correctly; reviewer + merge gate.
- **IM:** templates + validator script (frontmatter keys/enums/append-only checks) wired into CI; registry section generator.
- **OS:** agent behavior (EX-102), SLA job (EX-103), decide/execute tooling (EX-105/106).
- **TN:** owner `developer`; ADR-0005 mitigation. IDs `APR|QST-<yyyymmdd>-<seq>`.
- **TS:** unit — transitions, business-day SLA math, routing resolution; CI — valid passes, each invalid class fails.
- **DoD:** merged through gate; downstream tasks unblocked.
- **RD:** Tech Spec 001 §2 · ADR-0005 · Spec 002 P1-R1.

### EX-102 — Gate integration ([#11](https://github.com/sarankani/ai-company/issues/11))
- **US:** As the Founder, I want gate-hitting agents to write a record and stop so no approval depends on my presence in a session.
- **PS:** Agents currently ask in-chat at gates — approvals are invisible, unqueued, and founder-bound.
- **UC:** sales proposal → APR with exact send action → stop · blocked judgment → QST · in-chat approval still valid, record still written.
- **AC:** PR checklist proves zero gates lost across all 23 agents + 26 skills; sample run produces valid record; reviewer + tech-writer cross-check; merge gate.
- **IM:** append terminal gate behavior (Tech Spec 001 §5) to each gate-bearing charter/skill.
- **OS:** new gates or policy changes; routing machinery.
- **TN:** owners `developer`+`tech-writer`. Editing the company's own machinery — ADR-0006-level review rigor.
- **TS:** one sample per gate type produces a schema-valid record and no execution.
- **DoD:** merged; every charter's gates intact by checklist.
- **RD:** Tech Spec 001 §5 · ADR-0006 · CLAUDE.md §5.

### EX-103 — SLA/escalation job ([#12](https://github.com/sarankani/ai-company/issues/12))
- **US:** As a pending item, I want an engine moving me toward an available authorized human, never resolved by anything but a human decision.
- **PS:** Without automated routing, items rot behind absent humans or need manual shepherding — the exact failure the model exists to prevent.
- **UC:** healthy → wait · unavailable → immediate skip · SLA breach → one hop, both notified · chain end → CEO queue · double-run → zero duplicates.
- **AC:** Plan 001 A3 routing; idempotent by test; **no code path out of `pending`** (asserted); 2 h self-monitoring alert; merge gate.
- **IM:** scheduled job (~15 min cron); scan → route → append hops → single commit per run.
- **OS:** notification sending (EX-104 renders/sends); availability UI (EX-205); flip-triggered reassign (EX-301).
- **TN:** owner `developer`; ADR-0004 is the hard constraint; business-day math P1/P2, wall-clock P0.
- **TS:** unit — skip, hop, exhaustion→CEO, idempotent double-run; negative — no auto-resolve transition exists.
- **DoD:** merged; job running on schedule with monitoring.
- **RD:** Tech Spec 001 §3–4 · ADR-0004 · Spec 002 P1-R3.

### EX-104 — Email notifications ([#13](https://github.com/sarankani/ai-company/issues/13))
- **US:** As an approver, I want emails on assignment / 50 % SLA / escalation with a link, so I never watch a queue to hold my gate.
- **PS:** Records without notification = queues humans must poll; gates silently age.
- **UC:** assignment email with exact action + countdown · one 50 % warning · escalation to both humans · re-run → no duplicates.
- **AC:** exactly-once per event (forced re-run test); correct content; no PII beyond record, no secrets in logs; merge gate; procurement gate if paid provider.
- **IM:** event detection vs `notified` log inside EX-103's scan; append `{at,to,kind}` post-send; SMTP/API secret in Actions.
- **OS:** Slack (EX-303); panel deep links (Phase 2); digests.
- **TN:** owners `developer`+`devops`.
- **TS:** forced double-run; content snapshot tests; escalation dual-recipient test.
- **DoD:** merged; drill emails observed end to end (EX-107/108).
- **RD:** Tech Spec 001 §4 · Spec 002 P1-R4 · PRD §3.4.

### EX-105 — `/approve` helper ([#14](https://github.com/sarankani/ai-company/issues/14))
- **US:** As an authorized human, I want one-command decide (approve/reject/answer/delegate) so holding my gate is fast pre-panel and possible if the panel is ever down.
- **PS:** Editing YAML stamps by hand is error-prone and unauditable; decisions need a validated write path from day one.
- **UC:** approve → authz check → stamp → state flip · reject without reason → refused · answer QST · delegate with hop · dual-approval stays pending after one stamp.
- **AC:** unauthorized refused; dual-stamp behavior tested; complete stamp `{by,at,outcome,reason,conditions}` + Decision mirror; merge gate.
- **IM:** skill validating against `routing.md`/humans registry; registry update on close.
- **OS:** web inbox (EX-203 supersedes for non-technical humans; this remains fallback); execution (EX-106).
- **TN:** owner `developer`; identity source = humans registry.
- **TS:** authz matrix tests; reject-reason enforcement; dual-approval sequence.
- **DoD:** merged; used successfully in EX-107.
- **RD:** Tech Spec 001 §2.4/§3 · Spec 002 P1-R5.

### EX-106 — Exactly-once executor ([#15](https://github.com/sarankani/ai-company/issues/15))
- **US:** As the Founder, I want approved actions executed exactly once, verbatim, never before approval — "approved" means precisely that happened, once.
- **PS:** The resume loop is the system's hardest guarantee; emails aren't idempotent, so naive retries or races are catastrophic.
- **UC:** claim → execute → stamp · second executor sees claim → no-op · artifact hash mismatch → blocked + re-approval · stale claim → human flag · rejected → new linked record.
- **AC:** double-execution impossible by construction; mutation detected; unapproved execution impossible; stale-claim notifies; reviewer + security + merge gate.
- **IM:** claim-then-execute with commit-ordered atomicity; approval-time artifact hash comparison; MVP driver = human-initiated session, same protocol later automated.
- **OS:** automated triggers (Phase 3); retry policies for idempotent internal actions.
- **TN:** owner `developer`. **Plan 002 top risk trigger: no exactly-once ⇒ Phase 2 does not start.**
- **TS:** race test (two executors), mutation test, unapproved-record test, stale-claim path.
- **DoD:** merged with security sign-off; proven in EX-107.
- **RD:** Tech Spec 001 §6 · Plan 002 risks · Spec 002 P1-R6.

### EX-107 — Live drill ([#16](https://github.com/sarankani/ai-company/issues/16))
- **US:** As the Founder, I want one real deliverable through the full loop so I know it works before UI is built on it.
- **PS:** Components tested in isolation prove nothing about the loop; only an end-to-end real run does.
- **UC:** happy path full loop · approve-with-conditions · reject → rework as new linked record.
- **AC:** real deliverable; all five components exercised; exactly-once verified from stamps + git; timeline captured.
- **IM:** delivery-manager selects a low-blast-radius real artifact; run and observe.
- **OS:** escalation behavior (EX-108); UI; automated executor.
- **TN:** gate = the Founder's approval of the item itself.
- **TS:** the drill is the test; evidence = record + git history.
- **DoD:** documented pass; E1 exit criterion 1 met.
- **RD:** Spec 002 P1-R7 · Tech Spec 001 §8.

### EX-108 — Escalation drill ([#17](https://github.com/sarankani/ai-company/issues/17))
- **US:** As the Founder, I want to ignore one request and watch it escalate so I trust items never rot behind an unavailable human.
- **PS:** Escalation code that's never fired in anger is a hope, not a guarantee.
- **UC:** SLA breach hop with dual notification · `ooo` immediate skip · chain lands in CEO queue at n=1 — assigned, never dropped.
- **AC:** on-schedule hops with full history; exactly-once emails to both humans; item still `pending` until a human decides; findings logged.
- **IM:** test priority with short SLA (minutes) exercising production code paths.
- **OS:** auto-reassign UI (EX-301); Slack; load tests.
- **TN:** owner `tester`; no gate.
- **TS:** the drill; assertions on hops[], notified[], final state.
- **DoD:** documented pass; E1 exit criterion 2 met.
- **RD:** Spec 002 P1-R8 · ADR-0004 · Plan 001 A3.

### EX-109 — Baseline metrics ([#18](https://github.com/sarankani/ai-company/issues/18))
- **US:** As the CEO/Founder, I want measured baselines so Phase-3 SLA tuning and hiring order come from data, not guesses.
- **PS:** Without baselines, "the model works" and "who to hire first" are opinions.
- **UC:** drill timings computed from record timestamps · gate volume by department · metric formulas defined once for reuse (EX-304, Phase 4).
- **AC:** every number computed (no estimates), method stated; written to `memory/` + Plan 002; explicit hiring-order recommendation.
- **IM:** parse records; compute created→notified→decided→executed durations, hops, volume.
- **OS:** dashboards; the 2-week trial (EX-304).
- **TN:** owner `data-analyst`; tiny sample — report honestly.
- **TS:** spot-check computations against raw records.
- **DoD:** metrics + definitions published; EX-305 unblocked.
- **RD:** Spec 002 P1-R9 · Plan 001 F.

### EX-201 — Panel design brief ([#19](https://github.com/sarankani/ai-company/issues/19))
- **US:** As a non-technical approver, I want screens designed for deciding in one sitting so approving takes minutes and zero git.
- **PS:** The inbox's whole value is decision-readiness; without deliberate design the panel becomes a file browser.
- **UC:** SLA-sorted inbox → decide · CEO dashboard drill-down · Head reassigns seats · phone approval.
- **AC:** flows + all UI states for six screens (PRD US-1…12); AA; mobile decide; build-ready handoff; Founder approves.
- **IM:** `/design-brief` against PRD; states matrix per screen.
- **OS:** polish beyond system; analytics; Slack surfaces.
- **TN:** owner `designer`; success metric < 5 min median per item.
- **TS:** design review against PRD ACs; accessibility check.
- **DoD:** Founder-approved brief; EX-202 unblocked.
- **RD:** PRD §3 · Spec 002 P2-R1.

### EX-202 — Scaffold + auth + read layer ([#20](https://github.com/sarankani/ai-company/issues/20))
- **US:** As a registered human, I want magic-link sign-in and live state so I can operate approvals without git tooling.
- **PS:** Everything the panel does hangs off identity-mapped auth and a fresh-enough read of the repo.
- **UC:** matching email → access; unknown → denied · records via cached GitHub API · own-write revalidation.
- **AC:** SSR Next.js; no client tokens; 1:1 humans-registry mapping, no shared logins; TTL ≤ 5 min + revalidate; merged via Phase-1 loop.
- **IM:** Next.js + Auth.js magic link; GitHub App server-side token; cache layer.
- **OS:** decision writes (EX-203); dashboards (EX-204); admin (EX-205); any DB.
- **TN:** owner `developer`; hosting/auth spend → procurement gate.
- **TS:** authn/z integration tests; cache staleness + revalidation tests.
- **DoD:** merged via loop; skeleton renders live inbox data.
- **RD:** Tech Spec 001 §7 · ADR-0002.

### EX-203 — Inbox + Item Detail ([#21](https://github.com/sarankani/ai-company/issues/21))
- **US:** As an approver, I want an urgency-sorted queue and one-click decisions with full context, instantly recorded and auditable.
- **PS:** This screen is the product; a decision that isn't stamped-as-commit breaks the audit spine.
- **UC:** worst-first queue with countdowns · artifact + summary + exact action → approve (conditions) · reject (reason required) · delegate (authorized) · answer QST · write conflict → reload not clobber.
- **AC:** one decision = one commit (stamp + Decided-by trailer); server-side authz per routing; ≤ 60 s reflection; dual-approval visible; merged via loop.
- **IM:** decision API route committing via GitHub API with optimistic concurrency; markdown artifact rendering, link-out otherwise.
- **OS:** dashboards; audit ledger (EX-302); diff rendering.
- **TN:** owner `developer`; People-gate visibility restriction applies.
- **TS:** authz matrix; concurrency race; stamp completeness; PRD US-1…4 ACs.
- **DoD:** merged via loop; feeds EX-206.
- **RD:** PRD US-1…4 · Tech Spec 001 §7.

### EX-204 — Dashboard + Board ([#22](https://github.com/sarankani/ai-company/issues/22))
- **US:** As the CEO, I want one screen answering "what's the company doing and where is it stuck."
- **PS:** Visibility is a core goal (G3); without it the founder reconstructs state from files.
- **UC:** per-dept tiles (WIP, waiting+age, escalations, deliveries) drill to boards · CEO escalations flagged · Head filters by employee/type/state.
- **AC:** staleness ≤ 5 min; computed from records; People-gate hidden everywhere; composable filters; merged via loop.
- **IM:** aggregate over the EX-202 read layer; no extra store.
- **OS:** trends/analytics; audit ledger; exports.
- **TN:** owner `developer`.
- **TS:** aggregation correctness vs fixture records; visibility-restriction tests.
- **DoD:** merged via loop; feeds EX-206.
- **RD:** PRD US-5…8, 11 · Spec 002 P2-R5.

### EX-205 — Availability + admin ([#23](https://github.com/sarankani/ai-company/issues/23))
- **US:** As a human, I want one-click availability and (as Head) seat management so routing reflects reality without YAML.
- **PS:** Routing correctness depends on live availability; org changes need a safe, gated UI path.
- **UC:** flip `ooo` → skipped next run · Head proposes seat change → CEO approves (two-step) · unauthorized edit refused.
- **AC:** availability commits to registry, effective next run; seat changes gated two-step; full change history; merged via loop.
- **IM:** writes to `company/org/humans/` via the same commit path; UI enforces propose/approve.
- **OS:** calendar sync (Phase 4); SLA-table editing UI.
- **TN:** owner `developer`; Plan 001 risk #5 enforced in UI.
- **TS:** authz tests; two-step gating test; routing pickup test.
- **DoD:** merged via loop; feeds EX-206.
- **RD:** PRD US-8…9 · Tech Spec 001 §2.2–2.3.

### EX-206 — Panel security review ([#24](https://github.com/sarankani/ai-company/issues/24))
- **US:** As the Founder, I want the panel adversarially attacked before go-live — the system guarding every irreversible action must not be bypassable.
- **PS:** The panel concentrates decision authority; an authz hole here defeats every gate at once.
- **UC (attacks, all must fail):** decide outside seats · replay/forge decision commit · execute unapproved · post-approval mutation · People-gate leak via any path.
- **AC:** five scenarios fail with evidence; no PII in URLs/logs; secrets + dependency scanning in CI; findings→developer→re-test; Founder accepts.
- **IM:** adversarial test plan + manual attack pass by `security`.
- **OS:** fixing findings (developer); email-provider pentest; Phase-3 surfaces.
- **TN:** ship-blocker authority over EX-207.
- **TS:** the attack suite, kept as regression tests.
- **DoD:** accepted verdict, no open criticals.
- **RD:** Tech Spec 001 §7–8 · PRD §4.

### EX-207 — Deploy ([#25](https://github.com/sarankani/ai-company/issues/25))
- **US:** As the Founder, I want a checklisted, rollback-ready production deploy so humans can rely on the panel without fear of breakage.
- **PS:** An unmonitored or irreversible deploy of the approval surface risks the whole workflow.
- **UC:** go/no-go → authorize → deploy · failure → tested rollback, file loop unaffected · alerts on app errors + SLA-job silence.
- **AC:** checklist passed (auth everywhere, secrets, HTTPS, monitoring); rollback tested pre-go-live; EX-206 accepted; Founder authorizes.
- **IM:** devops deploy-readiness flow; host per procurement-gated choice.
- **OS:** scale hardening; multi-region; extra staging.
- **TN:** owner `devops`.
- **TS:** rollback rehearsal; smoke tests post-deploy.
- **DoD:** live behind auth; E2 unblocked to acceptance.
- **RD:** Spec 002 P2-R8 · Tech Spec 001 §7.

### EX-208 — Acceptance test ([#26](https://github.com/sarankani/ai-company/issues/26))
- **US:** As a future non-technical approver, I want to decide real items unaided so the model works for the humans it's designed for.
- **PS:** The Phase-2 exit is a human-capability claim; only a real non-technical run proves it.
- **UC:** email → deep link → sign in → review → approve → executed · reject with reason · delegate · set `ooo` and watch reassignment.
- **AC:** unaided completion; < 5 min median; correct stamps/audit; Founder accepts → Phase 2 exit.
- **IM:** scripted observed session; fallback think-aloud protocol with strict no-terminal rule.
- **OS:** polish backlog beyond blockers; load tests.
- **TN:** owners `tester`+`delivery-manager`.
- **TS:** the session itself + timing measurements.
- **DoD:** recorded pass; E2 closed.
- **RD:** PRD §6 · Spec 002 Phase 2 exit.

### EX-301 — Auto-reassign ([#27](https://github.com/sarankani/ai-company/issues/27))
- **US:** As an approver going offline, I want my pending items reassigned immediately so nothing waits out an SLA against an absent human.
- **PS:** SLA-expiry-only reassignment leaves items stalled for hours against known-absent humans.
- **UC:** `ooo` → all pending reassigned next run (hop: unavailable) · return → new items only, no bouncing · whole dept out → CEO queue.
- **AC:** first-run reassignment; no oscillation; correct hops + notifications; merged via loop.
- **IM:** extend EX-103 job with availability-change detection.
- **OS:** calendar availability; manual delegation UI (EX-302).
- **TN:** owner `developer`; same idempotency rules.
- **TS:** flip/flap tests; department-wide-out test.
- **DoD:** merged; observed in trial.
- **RD:** Spec 002 P3-R1 · Plan 001 A3.

### EX-302 — Delegation UI + audit screen ([#28](https://github.com/sarankani/ai-company/issues/28))
- **US:** As a Head/CEO, I want a filterable decision ledger and clean delegation so accountability is inspectable and workload manageable.
- **PS:** Audit data exists on records but isn't queryable; delegation lacks a UI path.
- **UC:** delegate from board with notification + logged hop · ledger filtered by dept/human/gate/date · one item's full lifecycle walk.
- **AC:** authorized-only delegation; 100 % decision coverage, append-only; People-gate restrictions respected; merged via loop.
- **IM:** read view over records + one write action.
- **OS:** exports; aggregated analytics.
- **TN:** owner `developer`; no new state.
- **TS:** coverage check vs record corpus; authz tests.
- **DoD:** merged; used in trial.
- **RD:** PRD US-8/12 · Spec 002 P3-R2.

### EX-303 — Slack notifications ([#29](https://github.com/sarankani/ai-company/issues/29))
- **US:** As an approver, I want requests in Slack with item deep links so decisions happen where I already work.
- **PS:** Email-only notification adds latency for Slack-native humans.
- **UC:** assignment DM with action + countdown + link · follow-ups threaded (one item = one thread) · Slack down → email still covers.
- **AC:** same idempotency log (no double-sends); auth-respecting deep links; minimal scopes; merged via loop; procurement gate if paid.
- **IM:** second channel behind the EX-104 event log; Slack app with DM scope.
- **OS:** deciding inside Slack (authz stays server-side in the panel); channel broadcasts.
- **TN:** owners `developer`+`devops`.
- **TS:** double-run test; unauthenticated deep-link flow.
- **DoD:** merged; observed in trial.
- **RD:** Spec 002 P3-R3 · PRD §3.4.

### EX-304 — 2-week SLA trial ([#30](https://github.com/sarankani/ai-company/issues/30))
- **US:** As the Founder, I want a measured live trial so "the model works" is proven before real hires sit on it.
- **PS:** Drills prove mechanisms; only sustained live use proves the system.
- **UC:** all real approvals via panel for two weeks · planned `ooo` exercising auto-reassign · report ranks departments for staffing.
- **AC:** zero terminal breaches; 100 % reach an authorized human; median < SLA/2; rejection-rate honesty check (0 % pin = smell); report to memory + Plan 002.
- **IM:** EX-109 metric definitions applied continuously.
- **OS:** fixing surfaced issues (new issues); load tests.
- **TN:** owner `data-analyst`; failure ⇒ fixes + re-run, not a closed-failed issue.
- **TS:** metric pipeline spot-checks.
- **DoD:** passing report published; EX-306 unblocked.
- **RD:** Plan 001 F · Spec 002 P3-R4.

### EX-305 — Hiring plan ([#31](https://github.com/sarankani/ai-company/issues/31))
- **US:** As the Founder, I want a complete fair hiring kit for the first Department Approvers, targeted where gate volume actually hurts.
- **PS:** De-founder-ing needs the right first hires; intuition-ordered hiring wastes the scarcest resource.
- **UC:** hiring-pipeline for top departments per data · JD describes decision-owner role honestly · Founder reviews kit and interviews.
- **AC:** data-justified order; full kit (JD, sourcing, loop, scorecard, debrief); comp TBD for Founder; budget flagged to finance; Founder approves kit.
- **IM:** `hiring-pipeline` workflow with EX-109/304 data as input.
- **OS:** offers (human); onboarding content (EX-306).
- **TN:** owner `hr`; people gate — HR prepares, Founder decides.
- **TS:** kit fairness checklist.
- **DoD:** approved kit; interviews can start.
- **RD:** Spec 002 P3-R5 · ADR-0003.

### EX-306 — Seat handover ([#32](https://github.com/sarankani/ai-company/issues/32))
- **US:** As a new approver, I want a runbook from day one to owning my queue so the handover is safe, reversible, and founder-independent.
- **PS:** The first seat transfer is the company's riskiest people-process moment; ad-hoc handover risks lost items and lost trust.
- **UC:** read → shadow → co-decide (founder as Deputy) → own · gated seat change in admin · rollback path with zero lost items.
- **AC:** runbook covers context, shadowing, decision-quality expectations, escalation etiquette, rollback; ≥1 non-founder approver live E2E; formal handover logged; first week zero terminal breaches in their department.
- **IM:** runbook doc + progression mapped to existing Deputy mechanics (no new code).
- **OS:** hiring (EX-305); comp/contract; Head-seat handovers (same runbook later).
- **TN:** owners `hr`+`tech-writer`; people gate.
- **TS:** the first real handover is the test.
- **DoD:** **Phase 3 exit** — the company's first true de-founder-ing, recorded in memory.
- **RD:** Spec 002 Phase 3 exit · Plan 001 D1.5.
