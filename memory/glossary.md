# Glossary

- **Company OS** — the persistent system of record under `company/` (accounts, leads, approvals, …); the single source of truth (ADR-0002).
- **Gate** — a point where an AI employee must stop for human approval (CLAUDE.md §5): merge-deploy, external-comms, money, commitments, people, procurement, revenue-booking.
- **Approver / Deputy / Head** — the three human seats per department; escalation runs approver → deputy → head → CEO (ADR-0003).
- **Seat** — a (department, role) assignment held by a human; one human may hold many seats.
- **APR / QST** — record-ID prefixes for approvals (`APR-<yyyymmdd>-<seq>`) and questions (`QST-…`) in `company/approvals|questions/`.
- **Hop** — one reassignment of a pending item (SLA breach, unavailability, manual delegation, escalation); append-only history on the record.
- **Resume loop** — the mechanism by which an approved action gets executed exactly once after a human decision (Tech Spec 001 §6: claim-then-execute).
- **Control Panel** — the web app (PRD 001) where humans see all AI work and decide gated items.
- **Terminal backstop** — the CEO queue; the always-staffed end of every escalation chain, so no item can dead-end.
- **Authoring skills** — the future `/create-agent`, `/create-skill`, `/create-workflow` skills (ADR-0006); Evalyn's gated way to grow its own roster.
- **Dogfooding rule** — during Phase 2, the Control Panel's own merges are approved through the Phase-1 approval loop.
