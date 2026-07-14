# Security Review 001 — Evalyn Control Panel (EX-206)

- **Reviewer:** `security` (AI) · **Date:** 2026-07-14 · **Scope:** `panel/` at EX-205 tip (EX-202→205)
- **Task:** [#24](https://github.com/sarankani/ai-company/issues/24) · **Gate:** Founder accepts · **Feeds:** EX-207 deploy
- **Verdict:** Conditional pass. Two High + one Medium were ship-blocking; **all findings below are fixed in this change** except where noted as a deploy-time precondition or an open policy decision (M3).

The panel's architecture defends in depth: every page and server action re-verifies the HMAC session and re-checks authorization server-side (never trusting the edge middleware), the markdown renderer is injection-safe (React nodes only), `git` runs via `execFile` with array args (no shell), the YAML-subset parser is quote/brace-aware with a write-time roundtrip guard, and login vs. session tokens are domain-separated. The exploitable gaps were in input validation of the `artifact` field, credential hygiene, dual-control separation of duties, and one People-gate visibility leak.

## Findings & disposition

| # | Sev | Finding | Disposition |
|---|---|---|---|
| H1 | High | `artifact` path traversal → arbitrary local file read **and** People-gate read bypass (a widely-visible record could name a People-gate record as its `artifact` and render its body) | **Fixed** — `safeRepoPath` + allowlist guard on every artifact-derived read; `LocalSource.readFile` asserts containment; artifact-that-is-a-record re-checked with `canView` |
| H2 | High | Magic links (15-min bearer credentials) logged to stdout even with SMTP set; tokens in URL; replayable | **Partially fixed** — link no longer logged when SMTP configured; dev log gated behind `AUTH_DEV_LOG`/non-prod. **Deploy preconditions remain:** wire real SMTP; single-use tokens (see residuals) |
| M3 | Med | Dual People gate didn't require two **distinct** humans — one person holding both `ceo` and `people-finance` seats satisfied both halves | **Fixed as a graduated control** — distinct humans required once ≥2 humans are qualified for the gate; at n=1 the documented same-human co-sign stands (EX-008 note b). **Policy decision for the Founder:** enforce strict-distinct immediately (makes People gates unsatisfiable until a 2nd qualified seat is hired) vs. the graduated default shipped here |
| M4 | Med | People-gate seat-change records leaked to any department Head on `/admin` | **Fixed** — seat-change list filtered through `canView`; section gated to People & Finance seats + CEO |
| M5 | Med | Open redirect via `return=` (protocol-relative/absolute URLs) | **Fixed** — `safeReturnTo` accepts only same-origin `/…` paths, enforced at sign-in and in `verifyLoginToken` |
| M6 | Med | Next.js 15.1.6 affected by CVE-2025-29927 (middleware bypass; impact contained by server-side re-checks) | **Fixed** — upgraded to 15.5.20 |
| L7 | Low | `LocalWriter` optimistic-concurrency TOCTOU (dev/CI only; prod `GitHubWriter` uses ref compare-and-swap) | **Accepted (dev-only)** — documented; prod path is atomic |
| L8 | Low | Unvalidated `department` interpolated into role-edit regex | **Fixed** — validated against `loadDepartments`; regex metacharacters escaped |
| L9 | Low | GitHub contents-API path interpolation could alter the query | **Fixed** — each path segment `encodeURIComponent`-encoded; host hard-pinned |

## Sound by inspection (checked and held)

- **Session crypto** — HMAC-SHA256 over base64url; login/session domain-separated by a `k` field each verifier checks; `timingSafeEqual` behind a length guard; `SESSION_SECRET` has no default and throws if unset.
- **Cookie flags** — `httpOnly`, `sameSite=lax`, `secure` in prod, 7-day `maxAge`, `path=/`; signout clears it.
- **Server-side authz on every mutation** — `decide`/`delegate` re-check `authorized`; `act()` re-checks `canView`; apply-seat-change requires `isCeoSeat`; propose requires `isHeadOf`. Human identity always comes from the verified session, never the client.
- **People-gate filtering on reads** — inbox, dashboard/stats, board all filter through `canView`/`visibleTo` before counting or listing (admin was the exception — M4, now fixed).
- **Record id / dept params** — `^(APR|QST)-\d{8}-\d{3}$` enforced in page and action; `dept` matched against departments or 404.
- **Markdown renderer** — React nodes only (auto-escaped); raw HTML renders as text; link URLs constrained to `https?://` — no `javascript:`/`data:`.
- **Command injection** — `execFile("git", [...])`, no shell; free-text `reason`/`conditions` go into the record body, not the commit message → no `Decided-by:` trailer forgery.
- **Write-integrity** — `dumpChecked` roundtrip guard; claim/complete enforce approved-state + exactly-once + artifact-sha-unchanged; seat changes cannot grant the `ceo` seat (`CHAIN` excludes it).
- **Secrets** — `GITHUB_TOKEN` only sent as a Bearer header, never logged; `SESSION_SECRET` never logged.

## Residual risks / deploy preconditions for EX-207

1. **SMTP delivery must be wired** before deploy — until then no seat-holder can sign in in production (the link is intentionally no longer logged).
2. **Single-use login tokens** — the panel is stateless (ADR-0002), so replay within the 15-min window can't be closed by a nonce store without state. **Founder decision (2026-07-14): accept the 15-minute single-window replay as a documented residual** — no state store added. Revisit if a higher-assurance posture is needed later.
3. **M3 policy** — **Founder decision (2026-07-14): graduated separation of duties** (shipped) — same human may co-sign the People gate while only one is qualified; distinct humans auto-required once a 2nd People/Finance or CEO seat is filled.
4. **Secrets provisioning** — `SESSION_SECRET` from a vault (high-entropy, uncommitted); `GITHUB_TOKEN` scoped to this repo, `contents:write` only, rotated; `NODE_ENV=production` so the `secure` cookie engages; confirm `GitHubWriter` (not `LocalWriter`) is active in prod so L7 doesn't apply.
5. **CI scanning** — wire dependency + secret scanning (Tech Spec §7 requires it); one moderate transitive advisory remains (postcss via Next's build tooling, not exploitable in our static-CSS app, unresolvable without a breaking Next downgrade).
6. **Engine parity** — M3 was applied to both `panel/lib/engine.ts` and `scripts/approval_engine.py`; keep any future auth/dual-control change in lockstep or CLI and panel decisions diverge.
