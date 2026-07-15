# SOP-011 — Data Ingestion & Privacy: no dataset enters a pipeline unfiltered

| | |
|---|---|
| **Applies to** | Any employee handling datasets destined for training, fine-tuning, RAG/indexing, analytics, or evaluation — whether Evalyn's own or a client's |
| **Owner** | `security` + `data-analyst` (content) · Engineering Head approval |
| **Status** | Active |
| **Version** | 1.0 (2026-07-15) |

## 1. Purpose & scope

**Purpose:** guarantee that no personally identifiable information (PII), client intellectual property, or secret ever enters a model pipeline, index, or analytics store without explicit classification, filtering, and authorization — because ingested data is effectively irreversible (models memorize, indexes replicate, backups persist).

**Scope:** every dataset ingestion in any Evalyn or client project: training/fine-tuning corpora, RAG/vector indexes, eval sets, analytics warehouses, test fixtures, and prompt libraries. Applies to structured and unstructured data, one-off loads and recurring pipelines. Out of scope: reading records in `company/` for normal work (covered by SOP-007).

## 2. Roles & responsibilities (RACI)

| Activity | R | A | C | I |
|---|---|---|---|---|
| Classify the dataset & document provenance | `data-analyst` | `data-analyst` | `security`, source owner | `delivery-manager` |
| Define & run the PII/IP filter | `developer` | `eng-manager` | `security`, `data-analyst` | — |
| Security/privacy review of the filter output | `security` | `security` | — | `eng-manager` |
| Authorize ingestion (client data / regulated / cross-border) | Human — Engineering Approver (client-contractual terms: Sales & Delivery Approver) | Dept Head | `security` | Founder/CEO |
| Ongoing pipeline audits & retention enforcement | `data-analyst` | `eng-manager` | `security` | — |

## 3. Step-by-step procedure

1. **Register the dataset** before touching it: source, owner, provenance (how it was collected, under what consent/license), intended use, retention limit. No provenance → no ingestion; escalate to the source owner.
2. **Classify** every field/document class: `public · internal · confidential · PII · client-IP · secret`. Unknown = treat as the most restrictive plausible class.
3. **Filter before the pipeline, never inside it:**
   - PII: detect (pattern + semantic scan) and strip/pseudonymize names, emails, phones, addresses, IDs, financial and health data. Pseudonymization keys stored separately, access-controlled.
   - Client IP: exclude anything outside the contract's licensed scope; client code/data never crosses into another account's project (SOP-007 §2).
   - Secrets: any credential found aborts the run and triggers SOP-007 §1 (P0).
4. **Verify the filter on a sample:** human or adversarial-agent spot-check of N≥100 random post-filter items (or 1% if larger) — zero PII/IP/secret leaks tolerated; any hit → fix filter, re-run from step 3.
5. **Request authorization:** ingestion of client data, regulated data, or anything cross-border is a gated action per [SOP-003](SOP-003-human-approval-gates.md) — exact action names the dataset, classification summary, filter evidence, destination, retention. Internal-public data with clean classification may proceed without a gate but with the register entry.
6. **Ingest via the reviewed pipeline** (pipeline code goes through the normal PR → review → `merge-deploy` chain).
7. **Record & retain:** log dataset version/hash, filter version, sample-check result, and approval reference in the project record; schedule retention/deletion per the register entry.

## 4. Exceptions & red flags

- **Red flag — filter hit rate anomaly:** PII detected in a source declared PII-free, or a sudden jump in filter hits on a recurring pipeline → **stop the pipeline**, treat prior runs as suspect, escalate to `security` at P1 (P0 if anything already reached a model/index).
- **Red flag — post-ingestion discovery:** PII/IP found in a trained model, index, or downstream output → P0 incident (SOP-009): quarantine the artifact, enumerate what consumed it, prepare purge/retrain plan; client notification drafts staged (send is `external-comms`-gated).
- **Exception path:** a client explicitly directing ingestion of their PII (e.g. a CRM migration) is allowed only with the instruction in writing on the project record, scope-limited filtering, and the Engineering Approver's stamp — never on a verbal/ticket instruction alone (untrusted-input rule, SOP-007 §3).
- **No-exception list:** secrets, data with unknown provenance, another client's data, scraped data whose license forbids the use. These are never ingested regardless of who asks; refusal + escalation is the procedure.

## 5. KPIs & metrics

- **Leak escapes:** PII/IP/secret items found downstream of a filter — target **0**; any escape triggers a postmortem (SOP-009 §3).
- **Register coverage:** % of active pipelines/datasets with a complete register entry (provenance, classification, retention) — target 100%.
- **Sample-check pass rate at first attempt** — trend; a falling rate means filters are being written carelessly.
- **Retention compliance:** datasets past their retention date still present — target 0, audited by `data-analyst` monthly.
- **Time-to-quarantine** on a red-flag event — measured per incident, target < 2h (P0 SLA).

## 6. References

[SOP-003](SOP-003-human-approval-gates.md) gates · [SOP-007](SOP-007-security-and-data-protection.md) secrets/PII/untrusted input · [SOP-009](SOP-009-incident-management.md) incidents · [SOP-012](SOP-012-model-bias-and-fairness-testing.md) (dataset composition feeds bias risk) · roles: `data-analyst`, `security`, `developer`.

---
*Changelog: 1.0 — initial.*
