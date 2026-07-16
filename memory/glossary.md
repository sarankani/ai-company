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
- **SOP library** — `docs/sop/`: foundations SOP-000…014 (binding on all employees) + one role SOP per employee; loaded by every charter at session start. Precedence: ADRs > CLAUDE.md > foundations > role SOPs > guides.
- **Five-part standard** — SOP-000 §2a: every operational SOP carries Purpose & Scope · Roles & Responsibilities (RACI) · Step-by-Step Instructions · Exceptions & Red Flags · KPIs & Metrics.
- **AI-ops SOPs** — SOP-011 (data ingestion & privacy), SOP-012 (model bias & fairness testing), SOP-013 (HITL review), SOP-014 (model deployment & rollback); mandatory for AI/ML delivery work.
- **HITL 30% rule** — SOP-013: AI handles ≤~70% of repetitive throughput; humans retain ≥~30% — critical QC, edge cases, final approval. Gates are always 100% human; sampled review covers the rest (≥10% floor on repetitive streams).
- **chief-of-staff** — the company-level dispatcher (SOP-R24): classifies any incoming request and routes it to the owning role/workflow with a brief; holds no gates, does no work, decides nothing.
