# Design Brief 001 — Evalyn Control Panel (MVP)

- **Status:** Draft — for Founder approval (EX-201, #19); approval = final-for-build
- **Owner:** designer · **Consumes:** [PRD 001](prd-001-control-panel.md) (US-1…US-12) · [Tech Spec 001](tech-spec-001-approval-loop-and-panel.md) §2/§7 · live record schema (`company/approvals/`)
- **Design goal in one line:** an approver decides a real item **in under 5 minutes, on any device, with zero git knowledge** — and never wonders "what does the system need from me?"

## 1. Design principles

1. **Decision-readiness over completeness.** Every screen answers "what needs me, how urgently, and what exactly happens if I say yes" before anything else.
2. **Amber means human.** The teal/amber semantic from Evalyn's operating diagrams carries into the product: teal = AI/system activity, amber = a human decision point. One glance = one meaning, everywhere.
3. **The exact action is sacred.** The `action` string renders verbatim, visually distinct (amber-bordered block), never truncated, never paraphrased. What you approve is literally what executes (hash-verified downstream).
4. **Nothing is modal that doesn't have to be.** Reject-reason and delegate-picker are inline expansions, not dialogs — mobile-friendly, no context loss.
5. **State honesty.** Cached data shows its age ("as of 2 min ago"); optimistic-concurrency conflicts reload visibly, never clobber (Tech Spec §7).

## 2. Information architecture & navigation

```
Signed-in shell (top bar: Evalyn wordmark · availability chip · human name/menu)
├── /inbox            Approval Inbox        (default landing for Approver/Deputy)
│   └── /item/:id     Item Detail (decide surface)
├── /dashboard        Company Dashboard     (default landing for CEO seat)
├── /board/:dept      Department Board
└── /admin            People & Routing      (Head/CEO only)
```

Mobile: bottom tab bar (Inbox · Dashboard · Boards · Admin), decide actions thumb-reachable. Desktop: left rail.

## 3. The golden flow — email to executed, < 5 min

1. Email/Slack: "[Evalyn assigned] APR-… · money · P1" → deep link.
2. Magic-link sign-in (email → 6-digit code or link; session persists 30 days).
3. Land **directly on Item Detail** (never the inbox first — the link knows the item).
4. Read: summary → exact action (amber block) → artifact preview → decide.
5. One tap: **Approve** → confirmation strip "Approved — execution will follow, exactly once" → next pending item offered ("2 more waiting").

Fallback flow (no email): open inbox → worst-SLA item is pre-focused at top.

## 4. Screen specs (all five states each: empty · loading · error · success/populated · permission-denied)

### 4.1 Approval Inbox (`/inbox`) — the heart

- **List item anatomy (one row):** [gate chip] [type icon APR/QST] **action (2-line clamp)** · requested_by · department · [SLA countdown pill — live, `tabular-nums`] · [state chip].
- **Sort:** worst SLA first (US-1). Overdue = amber-filled pill + row elevated; escalated-to-me = amber left border + "escalated from <human>" microcopy.
- **Sections:** "Needs you (N)" → "Waiting on others (dual-approval second stamps)" → "Recently decided (7 days)".
- **Empty:** "Inbox zero — nothing needs you." + last-decided recap (positive, not blank).
- **Error:** "Can't reach the repo — showing cached items from HH:MM" (stale-badge on every row).
- **Permission-denied:** only occurs deep-linking someone else's restricted item → "This item belongs to the People & Finance seat" + request-access mailto.

### 4.2 Item Detail (`/item/:id`) — the decide surface

Layout (desktop two-column; mobile stacked):
- **Left/Main:** ① header (id · gate chip · priority · SLA countdown · assignee avatar) ② **the exact action** — amber-bordered block, monospace, copy button ③ AI summary + recommendation (from record body) ④ artifact preview: markdown rendered inline; anything else = typed link-out card with SHA ⑤ timeline (created → hops with reasons → notifications → stamps) — the audit trail as a vertical stepper, teal/amber dots.
- **Right/Sticky bottom (mobile):** the **decision panel** —
  - `Approve` (primary) → optional conditions field on tap-and-hold/expander
  - `Reject` → inline reason field appears, **submit disabled until reason non-empty** (mirrors engine rule)
  - `Delegate` → inline picker listing only authorized humans for this department (from org registry), with availability dots
  - `Ask a follow-up` → thread composer (writes to record Thread; item stays pending)
  - Dual-approval items: progress meter "1 of 2 stamps — needs a ceo-seat stamp", second button disabled with explainer if the viewer already stamped.
- **Conflict state:** if the record changed since load → non-dismissable strip "This item changed (new hop). Reloading…" — decision buttons disabled during reload (state honesty, §1.5).
- **Post-decision:** buttons collapse into the stamp ("Approved by you · 14:02") + "execution pending → exactly once" status line that flips when `executed_at` lands.

### 4.3 Company Dashboard (`/dashboard`)

- 7 department tiles: WIP count (teal), **waiting-on-human count + oldest age** (amber, dominant), escalations in flight (amber outline), delivered-this-week (muted). Tile → Department Board.
- **"Escalated to you" strip** pinned above tiles for the CEO seat (US-6) — never buried.
- Data-age badge top-right ("as of 12:04 · refreshes ≤5 min"). Empty state (no records): onboarding copy pointing to the value chain.

### 4.4 Department Board (`/board/:dept`)

- Filter bar: AI employee · record type · state (chips, composable, URL-persisted).
- Grouped list by state: in-progress work (from registry/records) → waiting-on-gate → delivered.
- Head-only affordance: overflow menu per pending row → "Reassign…" (same authorized-picker as delegate).
- People-gate rows: visible only to People & Finance seats + CEO; others see nothing (not a redaction row — total absence, per PRD Q3).

### 4.5 People & Routing admin (`/admin`) — Head/CEO only

- Humans list: name · email · seats (dept×seat chips) · availability.
- **Seat change = two-step, visualized:** Head proposes (creates the gated change) → banner "awaiting CEO approval" → CEO sees Approve/Reject inline. Never a direct edit (Plan 001 risk #5).
- Routing table read-only in MVP (SLA/gate map shown with "changes are file-gated" note).

### 4.6 Availability (everywhere)

- Top-bar chip: ● Available / ◐ Busy / ○ OOO-until-date (date picker). One tap to change; toast: "Routing will skip you from the next scan (≤15 min). N pending items will reassign."

## 5. Visual system

- **Theme:** light default + dark; both from one token set. Panel is a daily tool — calmer than the ops-console diagrams: near-white ground, ink text, **teal `#157A6E` (system/AI) and amber `#A26E12` (human decision) as the only two accent hues**; red reserved strictly for errors, green for success toasts.
- **Type:** system stack; `tabular-nums` for countdowns/ids; monospace for record ids and the exact-action block.
- **Density:** comfortable list rows ≥ 56 px; touch targets ≥ 44 px; max content width 880 px for reading surfaces.

## 6. Accessibility (AA — acceptance-blocking)

- Full keyboard path: inbox `↑/↓` row focus, `Enter` opens, `A/R/D` shortcuts **only** with visible focus + confirm step; skip-links; focus rings never suppressed.
- SLA countdowns: `aria-live="polite"` at threshold crossings only (not every second); text alternative "due in 3 hours".
- Color never sole signal: overdue = pill **+** "Overdue" text; amber/teal chips carry labels.
- Contrast ≥ 4.5:1 both themes (amber-on-white pairs pre-checked); reject-reason error announced to SR; `prefers-reduced-motion` respected (no countdown pulse).

## 7. Developer handoff — contracts

- **Data:** screens consume record frontmatter fields exactly as in Tech Spec §2.4 — no derived/duplicated state. SLA pill = `sla_due` − now; urgency sort key = `(overdue?, sla_due)`; escalated badge = `hops[-1].reason ∈ {sla-breach, unavailable}`.
- **Writes:** four mutations only — decide / delegate / availability / seat-proposal — each = one commit via the server (Tech Spec §7 write path). UI must treat engine refusals (401-style responses) as **renderable outcomes, not exceptions** (e.g., "You don't hold a seat in people-finance").
- **Components (build order):** SLAPill → GateChip → RecordRow → ActionBlock → DecisionPanel → TimelineStepper → DeptTile → AuthorizedPicker → AvailabilityChip → ConflictStrip.
- **Routes:** as §2; deep links must survive sign-in redirect (post-auth return-to).

## 8. Out of scope (MVP)

Audit-ledger screen & delegation history views (EX-302) · Slack surfaces (EX-303) · analytics/trends (Phase 4) · editing business records · artifact diff rendering (link-out only, PRD open Q2) · dark-mode illustrations.

## 9. Open questions for the Founder (answer at brief approval)

1. **Q-1:** post-decision, auto-advance to the next pending item (speed) or stay on the stamped item (confidence)? *Designer recommends: stay, with a "Next (N)" button — confidence first at this trust stage.*
2. **Q-2:** should Deputy see the Approver's queue passively ("watching") or only on reassignment? *Recommends: only on reassignment — avoids double-decide ambiguity.*
3. **Q-3:** session length 30 days OK for a decision tool, or shorter (7 days) given money/people gates? *Recommends: 7 days + instant re-auth via magic link.*
