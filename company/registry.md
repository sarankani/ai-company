# Company OS registry

Index of all records in `company/`. Every employee updates this file when creating or closing a record (CLAUDE.md §3).

## Org (routing source of truth)

| Record | What | Status |
|---|---|---|
| [org/departments.md](org/departments.md) | 7 departments, employees, gates owned | active |
| [org/humans/saran.md](org/humans/saran.md) | Saravanan Pitchaikani — Founder/CEO; all seats except 3 handed-over Approver seats | active |
| [org/humans/saravanan-p.md](org/humans/saravanan-p.md) | Saravanan P — Approver: engineering, product-design, operations | active |
| [org/routing.md](org/routing.md) | Gate→department map · SLAs · escalation chain · authorization | active |

## Approvals & questions (open items)

<!-- approvals:begin -->
| id | type | gate | department | state | assignee | sla_due |
|---|---|---|---|---|---|---|
| APR-20260715-001 | approval | external-comms | marketing-support | approved | saran | 2026-07-20T05:52:17Z |
| APR-20260715-007 | approval | merge-deploy | engineering | approved | saravanan-p | 2026-07-16T19:53:57Z |
| APR-20260715-008 | approval | merge-deploy | engineering | approved | saravanan-p | 2026-07-16T19:54:08Z |
| APR-20260715-009 | approval | merge-deploy | engineering | approved | saravanan-p | 2026-07-16T19:54:18Z |
<!-- approvals:end -->


## Business records

Business records (leads, opportunities, projects, invoices, … — all 16 types) live in **Twenty CRM**, not in this repo. AI employees read/write via **`scripts/twenty-client.mjs`** (env: `TWENTY_API_URL`, `TWENTY_API_KEY`). The Twenty instance is the source of truth for all business entities; gated stage moves still file ordinary APRs and stay parked until a human decides. This registry indexes governance records (approvals/questions/org) only.
