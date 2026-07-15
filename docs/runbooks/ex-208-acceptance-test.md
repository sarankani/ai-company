# EX-208 — Acceptance Test: a human decides real AI deliveries through the panel

Owners: `tester` + `delivery-manager`. Gate: **Founder accepts** → Phase 2 exit. Issue: [#26](https://github.com/sarankani/ai-company/issues/26).

**Claim under test:** a human can decide real items on the deployed Control Panel **unaided — no terminal, no git, no Claude Code** — in a few minutes, with a correct, attributable audit trail. This is the Phase-2 exit criterion (PRD §6).

---

## Setup (already done for you)

- Panel is live: **https://ai-company-jet.vercel.app**
- Three real, low-risk decisions are seeded and pending in your inbox (routed to your marketing-support seat):
  - `APR-20260715-001` — approve a homepage one-liner (on-brand → **approve**)
  - `APR-20260715-002` — a tagline that breaks the honesty bar (→ **reject with a reason**)
  - `QST-20260715-001` — a real brand-voice question (→ **answer**)
- Each is clearly marked `[EX-208 acceptance test]` in its summary so it's never mistaken for a live publish.

**The one rule:** during the session, touch **only the browser and your email**. No terminal, no git, no CLI. If you can't do something without them, that's a finding — note it.

---

## Scenarios (do these on the live panel)

Note the wall-clock time you start and finish each — target is **< 5 min median per decision**.

### 1. Sign in (email → deep link)
1. Open https://ai-company-jet.vercel.app
2. Enter your email (`saranpkani@gmail.com`), submit.
3. Open the email, click the sign-in link. You should land on your **Inbox**.
- ✅ Pass: you reached the inbox from email alone.

### 2. Approve (the core flow)
1. In the inbox, open **APR-20260715-001** (the homepage one-liner).
2. Read the exact action and the summary/recommendation.
3. Click **Approve**.
- ✅ Pass: the item shows **approved by you**, with your name and time.

### 3. Reject with a reason
1. Open **APR-20260715-002** (the "100% AI, zero humans, never make a single mistake" tagline).
2. Recognize it violates the honesty bar. Click **Reject…**, type a reason (e.g. *"Unbackable claims; contradicts our human-in-the-loop model — rewrite honestly"*), submit.
- ✅ Pass: the reason field was required, and the item shows **rejected** with your reason.

### 4. Answer a question
1. Open **QST-20260715-001** (brand voice: "we" vs. named AI employees).
2. Answer it (the answer is required and is recorded on the item).
- ✅ Pass: the item shows **answered** with your text.

### 5. Availability toggle
1. In the top bar, open your availability menu and set **Busy** (or OOO with a date).
2. Confirm the chip updates and the toast/help text explains routing.
3. Set yourself back to **Available**.
- ✅ Pass: status changed without touching anything but the menu.

*(Delegation is exercised in the automated e2e suite; a live delegate demo is deferred until a second marketing-support seat exists — at n=1 there's no distinct authorized human to delegate to.)*

---

## Results (fill in during/after the session)

| Scenario | Completed unaided? | Time | Notes / friction |
|---|---|---|---|
| 1. Sign in | ☐ | | |
| 2. Approve | ☐ | | |
| 3. Reject + reason | ☐ | | |
| 4. Answer | ☐ | | |
| 5. Availability | ☐ | | |

**Median decision time:** ___  ·  **Any terminal/git needed?** ___  ·  **Blocking issues:** ___

---

## Verification (tester, after the session — from the record trail, not the UI)

Each decision the panel writes is a commit to `main` with a `Decided-by: <you>` trailer and the app as commit author. After the session, confirm on `main`:
- `APR-20260715-001` → `state: approved`, decision by `saran`, panel commit.
- `APR-20260715-002` → `state: rejected` with a non-empty reason.
- `QST-20260715-001` → `state: answered` with your answer.
- All three appear in the `/audit` ledger, attributed to you.
- The registry shows them closed (removed from open items).

## Pass criteria (AC)
- [ ] All scenarios completed using only the browser + email (no terminal/git).
- [ ] Median decision time < 5 minutes.
- [ ] Stamps + audit correct and attributable.
- [ ] Founder accepts → **Phase 2 exit recorded.**
