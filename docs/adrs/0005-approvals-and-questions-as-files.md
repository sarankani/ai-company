# ADR-0005 — Approvals and questions are Company OS records (files)

- **Status:** Proposed — awaiting Saran
- **Source:** Plan 001 C2 · Tech Spec 001 §2

## Context

Gate requests and AI-to-human questions need a durable, routable representation. Options: files in the Company OS, GitHub Issues, or rows in a service's database. This choice shapes how agents raise gates, how the panel reads state, and how execution resumes.

## Decision

Approvals (`company/approvals/APR-*.md`) and questions (`company/questions/QST-*.md`) are first-class Company OS records: markdown with YAML frontmatter carrying id, gate, department, priority, state, assignee, exact action, hop history, notification log, decision stamp, and execution stamp (schema: Tech Spec 001 §2.4). One state machine, two item types. Follows ADR-0002: same store as every other company record.

## Consequences

- Agents raise a gate by writing a file and stopping — no new APIs to integrate; the panel, SLA job, and executor all consume the same record.
- Append-only `hops`/`notified` fields make the SLA job idempotent and the audit trail complete.
- Rework loops are explicit: a rejected item is closed and a new linked record opens — no ambiguous re-approval of mutated artifacts (execution verifies the artifact hash from approval time).
- Cost: schema discipline (a malformed record breaks routing) — mitigated by templates, a validating check in CI, and the `/approve` helper skill.

## Alternatives considered

**GitHub Issues per approval** — free UI/notifications, but non-technical approvers shouldn't live in Issues, custom SLA/routing logic fights the platform, and state would fork from the Company OS. Kept as a possible notification bridge, not the record.
