# ADR-0001 — Record architecture decisions as ADRs

- **Status:** Accepted (process decision; effective 2026-07-12)

## Context

Evalyn's decisions are made across many AI sessions and (soon) many humans. Rationale that lives only in chat history or one person's head is lost; future employees re-litigate or silently contradict it.

## Decision

Every significant, hard-to-reverse technical or operating-model decision gets an ADR in `docs/adrs/`, numbered, immutable once accepted (supersede, don't rewrite). AI employees propose ADRs; a human accepts them. Operational (reversible, day-to-day) decisions go to `memory/decisions-log.md` instead.

## Consequences

Slight writing overhead per decision; in exchange, any employee — AI or human — can reconstruct *why* the system is shaped the way it is, and changes to load-bearing decisions become explicit (a superseding ADR) rather than accidental.
