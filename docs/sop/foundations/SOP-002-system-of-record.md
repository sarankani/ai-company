# SOP-002 — System of Record: read it, write it, trust it

| | |
|---|---|
| **Applies to** | All AI employees |
| **Owner** | `ceo` · Founder/CEO approval |
| **Status** | Active |
| **Version** | 1.0 (2026-07-15) |

## Standard

An AI company coordinates through **records, not conversations**. Any fact that two employees both need lives in exactly one record; every employee reads the relevant record before acting and writes the next record as its output. If it isn't in the system of record, it didn't happen.

## 1. Where state lives

- **Business records:** `company/` — entities `accounts, contacts, leads, opportunities, estimates, quotes, proposals, pos, projects, sows, milestones, invoices, tickets, vendors, purchase-orders-out, assets`, indexed by `company/registry.md`. (In production these map onto CRM/ERP/PSA via MCP — reads are free, external writes are gated per SOP-003.)
- **Approvals & questions:** `company/approvals/APR-*.md`, `company/questions/QST-*.md` (SOP-003).
- **Org & routing truth:** `company/org/` (`departments.md`, `humans/`, `routing.md`) — never hardcode an approver.
- **Docs & memory:** `docs/` and `memory/` (SOP-010).

## 2. Record discipline

Every record carries: **id · stage/status · owner (employee) · links** to related records · **history log · approval stamps**. Rules:

1. **Read before write.** Open the record and its linked records before acting on the entity. Never re-derive or guess a fact a record already holds.
2. **Write at every stage change.** Move `stage`, append one history line (date · actor · what changed · why/link), update `registry.md`.
3. **One owner per record.** Only the owner moves the stage; others append notes or request changes. Taking over ownership is itself a history entry.
4. **Links are bidirectional in meaning:** an opportunity links its account, estimate, quote, PO, project — a reader must be able to walk the whole chain from any node.
5. **Approval stamps are sacred:** a stage whose transition is gated (e.g. milestone `delivered → accepted`, invoice `draft → sent`) may only be moved with the APR reference in the stamp. No stamp, no transition.
6. **Never delete a record** — mark it `lost`, `disqualified`, `closed`, `retired`. History is the audit trail.

## 3. Entity lifecycles (owners in parentheses)

Lead (sdr): `new → contacted → qualified/disqualified` · Opportunity (sales): `discovery → scoping → proposal → negotiation → won/lost` · Estimate (solutions-architect): `draft → reviewed → approved` · Quote (finance+sales): `draft → approved → sent → accepted` · Proposal/SOW (sales+delivery-manager): `draft → sent → signed` · Customer PO (sales→finance): `received → verified → booked` · Project (delivery-manager): `kickoff → in-delivery → UAT → delivered → closed` · Milestone (delivery-manager): `planned → in-progress → delivered → accepted → invoiced` · Invoice (finance): `draft → sent → paid/overdue` · Ticket (support): `new → triaged → in-progress → resolved → closed` · Vendor (procurement): `prospective → approved → active` · PO-out (procurement): `requested → approved → ordered → received` · Asset (procurement): `procured → allocated → in-use → retired`.

Full schema: `guides/company-os.md`.

## 4. Anti-patterns

- Never carry state in chat/context that belongs in a record ("I'll remember the customer said…" — write it to the contact/opportunity record).
- Never move a gated stage transition without an approval stamp.
- Never fork the truth: no shadow spreadsheets, no duplicate records for the same entity.
- Never leave `registry.md` stale after touching a record.

---
*Changelog: 1.0 — initial.*
