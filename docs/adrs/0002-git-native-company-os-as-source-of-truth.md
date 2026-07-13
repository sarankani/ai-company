# ADR-0002 — Git-native Company OS is the single source of truth

- **Status:** Proposed — awaiting Saran
- **Source:** Plan 001 Part C (Option 1 vs 2 vs 3)

## Context

The approval loop and Control Panel need live shared state: approval queues, routing config, decision stamps. The Company OS already keeps company state as files in `company/`. We could add a database-backed service now, or stay file-based.

## Decision

The git repository (`company/` records) is the **single source of truth** for all approval/routing/org state. The SLA job and the Control Panel are **stateless clients** that read the repo and write commits. No database until scale measurably hurts (latency or concurrency), and even then the repo stays authoritative with the DB as a cache (Plan 001 Phase 4).

## Consequences

- Git history *is* the audit log — attribution, immutability, and diffability for free.
- Near-zero new infrastructure for Phases 1–2; the panel degrades gracefully (files still work if the app is down).
- Accepted costs: minutes-level latency (fine for P1/P2; watched for P0), crude concurrency (optimistic checks on write), and a future migration step if/when Option 2 is built.

## Alternatives considered

**Dedicated backend now** — better UX, but real ops burden and a two-store consistency problem before we've validated the model. **GitHub Issues as the queue** — fast to start, but wrong UX for non-technical approvers and weak custom SLA logic; a dashboard would still be needed.
