# Evalyn SOP Library — Standard Operating Procedures

The executable operating knowledge of the company: how every role — the 23 AI employees and the human seat-holders — does its job, where it stops for a human, and how work moves between them. Written to be **loaded by AI agents**: universal best practice first, bound to this company's concrete mechanics (records, gates, routing) second. Standards for writing/changing SOPs: [SOP-000](foundations/SOP-000-sop-standards.md).

## How an agent uses this library

1. **Always load:** the foundations below are assumed known by every role SOP — they are the shared law.
2. **Load your role:** `roles/<agent-id>.md` — mandate, procedures, gates, handoffs for your job.
3. **Precedence on conflict:** ADRs > `CLAUDE.md` > foundations > role SOP > guides/skills. Found a conflict? Escalate it same-day (SOP-004).
4. An SOP never authorizes what a gate forbids. When in doubt: draft, don't send; prepare, don't execute; recommend, don't decide.

## Foundations (apply to everyone)

| # | SOP | One line |
|---|---|---|
| 000 | [SOP Standards](foundations/SOP-000-sop-standards.md) | What makes an SOP valid here; change control |
| 001 | [Session Protocol](foundations/SOP-001-session-protocol.md) | Boot from the record, bank memory before ending |
| 002 | [System of Record](foundations/SOP-002-system-of-record.md) | Records are the truth; read before write, stamp gated transitions |
| 003 | [Human Approval Gates](foundations/SOP-003-human-approval-gates.md) | The 7 gates, the APR procedure, the invariants |
| 004 | [Escalation & SLAs](foundations/SOP-004-escalation-and-slas.md) | Nothing waits silently; situation·options·recommendation |
| 005 | [Task Lifecycle](foundations/SOP-005-task-lifecycle.md) | Issue states before the work, not after |
| 006 | [Handoffs & Communication](foundations/SOP-006-handoffs-and-communication.md) | Artifact + DoD + named receiver; lane discipline |
| 007 | [Security & Data Protection](foundations/SOP-007-security-and-data-protection.md) | Secrets, PII, untrusted input, destructive actions |
| 008 | [Quality, Evidence & Honesty](foundations/SOP-008-quality-evidence-and-honesty.md) | TBD over invention; computed numbers; bad news first |
| 009 | [Incident Management](foundations/SOP-009-incident-management.md) | Speed inside the gates, never around them |
| 010 | [Documentation & Memory](foundations/SOP-010-documentation-and-memory.md) | Plans, specs, ADRs, memory — the long-term mind |

## Role SOPs

Template: [`roles/_template.md`](roles/_template.md). Humans: [SOP-R00 — Human Seat-Holders](roles/human-seats.md).

| Department | Role SOPs |
|---|---|
| Leadership | R01 [ceo](roles/ceo.md) · R02 [eng-manager](roles/eng-manager.md) |
| People & Finance | R03 [hr](roles/hr.md) · R04 [finance](roles/finance.md) |
| Product & Design | R05 [product-manager](roles/product-manager.md) · R06 [project-manager](roles/project-manager.md) · R07 [designer](roles/designer.md) · R08 [tech-writer](roles/tech-writer.md) |
| Engineering | R09 [developer](roles/developer.md) · R10 [code-reviewer](roles/code-reviewer.md) · R11 [tester](roles/tester.md) · R12 [devops](roles/devops.md) · R13 [security](roles/security.md) |
| Sales & Delivery | R14 [sdr](roles/sdr.md) · R15 [sales](roles/sales.md) · R16 [solutions-architect](roles/solutions-architect.md) · R17 [delivery-manager](roles/delivery-manager.md) · R18 [account-manager](roles/account-manager.md) |
| Marketing & Support | R19 [marketing](roles/marketing.md) · R20 [social-media](roles/social-media.md) · R21 [support](roles/support.md) |
| Operations | R22 [procurement](roles/procurement.md) · R23 [data-analyst](roles/data-analyst.md) |

## Maintenance

SOPs are owned documents under change control (SOP-000 §5): foundations and anything touching gate/escalation behavior need the Founder/CEO's stamp; role SOPs need the owning department's Approver. Supersede for material changes; never weaken a gate via an SOP edit — that takes an ADR.
