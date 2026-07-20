# Roles & Designations — Evalyn org catalog

The canonical map from a **real-world designation** (the titles a growing IT services company hires for) to the **AI archetype agent** that operates as it today. It exists so the company can speak in normal org-chart terms while running on a small set of archetype agents (`.claude/agents/`), and so the growth path from n=1 to a staffed org is explicit.

**Changes to this file are gated** the same way as `departments.md`: the affected Department Head proposes, the CEO approves (Plan 001 risk #5).

## How to read this

- **One agent operates as many designations.** An archetype agent (e.g. `developer`, `sales`) is a *role family*, not a single title. `developer` operates as everything on the Engineering IC ladder; `sales` operates as AE through Sales Director. The agent covers the *work*; the designation is the *hat* it wears for a given task.
- **Seniority = the level the same agent works at**, not a different agent. "Principal Engineer" vs "SDE I" is the `developer` agent operating with more autonomy, wider blast radius, and deeper judgment — the charter's gates are identical; the scope is not. Leadership titles (VP/Director) map to the department's *lead/manager* agent plus, for company-level scope, `ceo`.
- **Specializations = the context of the task**, not a separate agent. Frontend / Backend / Mobile / Platform are all `developer` (or `ml-engineer` for AI/data); the specialization is which part of the stack the task touches.
- **Human seats are separate from AI agents.** The C-suite/VP *authority* (the approval gates) is held by **human seats** per `departments.md` / `routing.md` — today all held by the Founder-Operator. An agent may *operate as* "CFO" to prepare the work, but the CFO **decision** is a human gate. See "Human seats vs AI agents" below.
- **`[GAP]`** marks a designation whose work no agent covers yet — a deliberate future hire, tracked here so it's visible rather than silently uncovered.

The three agents added to close structural gaps — **`ml-engineer`**, **`it-admin`**, **`legal-counsel`** — are noted where they apply.

---

## Engineering  → `engineering` dept
| Designation | Operating agent | Scope note |
|---|---|---|
| VP Engineering, Director of Engineering | `eng-manager` (+ `ceo` for org-level) | department leadership, cross-team delivery, headcount prep |
| Engineering Manager | `eng-manager` | the archetype at its home level |
| Tech Lead | `eng-manager` / `developer` (senior) | technical direction of a pod; a senior IC hat |
| Principal / Staff / Senior SDE (SDE III) / SDE II / SDE I / Associate / Intern | `developer` | one agent, ascending autonomy & blast-radius; gates identical |
| ML / AI build (from the Data & AI ladder) | `ml-engineer` | pipelines, models, MLOps — see Data & AI |
| **Specializations:** Frontend, Backend, Full-Stack, Mobile (iOS/Android), Embedded, Platform | `developer` | specialization = which part of the stack the task touches |

## Quality Assurance  → `engineering` dept
| Designation | Operating agent | Scope note |
|---|---|---|
| QA Manager, QA Lead | `tester` (lead scope) / `eng-manager` | test strategy & sign-off ownership |
| SDET (Software Engineer in Test) | `tester` | automation-heavy IC hat |
| Senior QA / QA Engineer / Manual Test / Automation Test Engineer | `tester` | one agent, ascending scope; manual vs automation = task context |

## DevOps / Infrastructure  → `engineering` dept
| Designation | Operating agent | Scope note |
|---|---|---|
| Head of Infrastructure, DevOps Lead | `devops` (lead) / `eng-manager` | owns the deploy gate & infra direction |
| Senior DevOps/SRE, Site Reliability Engineer, Cloud Engineer, Platform Engineer, Build & Release Engineer | `devops` | production infra, CI/CD, reliability |
| Systems Administrator | `it-admin` (internal) / `devops` (prod boundary) | internal systems → `it-admin`; prod systems → `devops` |

## Data & AI  → `engineering` (build) + `operations` (analytics)
| Designation | Operating agent | Scope note |
|---|---|---|
| Head of Data, Data Engineering Lead | `data-analyst` / `ml-engineer` (lead) / `eng-manager` | data strategy & pipeline ownership |
| Senior Data Engineer, Data Engineer | `ml-engineer` | pipelines, feature engineering |
| ML Engineer, MLOps Engineer | `ml-engineer` | the archetype at its home level |
| Data Scientist | `ml-engineer` (modeling) / `data-analyst` (analysis) | build side → ml-engineer; insight side → data-analyst |
| Data Analyst, Analytics Engineer, BI Developer | `data-analyst` | metrics, dashboards, business insight |

## Security  → `engineering` dept
| Designation | Operating agent | Scope note |
|---|---|---|
| CISO / Head of Security | `security` (lead) / `ceo` | security posture & risk ownership |
| Security Architect, Application Security Engineer, SOC Analyst | `security` | threat modeling, AppSec review, monitoring |
| Compliance Officer (SOC 2 / ISO 27001 / DPDP-GDPR) | `legal-counsel` (program) + `security` (controls) | framework evidence → legal-counsel; controls → security |

## Product  → `product-design` dept
| Designation | Operating agent | Scope note |
|---|---|---|
| CPO, VP Product, Director of Product | `product-manager` (+ `ceo`) | product strategy & roadmap authority |
| Group PM, Senior PM, Product Manager, Associate PM | `product-manager` | one agent, ascending scope |
| Product Owner | `product-manager` / `project-manager` | backlog ownership at the delivery boundary |
| Business Analyst | `product-manager` / `data-analyst` | requirements + data |
| Technical Writer | `tech-writer` | (also listed under Product in the source org) |

## Design  → `product-design` dept
| Designation | Operating agent | Scope note |
|---|---|---|
| Head of Design, Design Lead | `designer` (lead) | design direction & system ownership |
| Senior UX / UX Designer / UI Designer / Product Designer | `designer` | one agent; UX vs UI = task context |
| UX Researcher | `designer` (+ `data-analyst` for research data) | discovery & usability research |
| Graphic / Brand Designer | `designer` (+ `marketing` for brand) | brand & visual assets |

## Program & Delivery  → `product-design` (internal) + `sales-delivery` (client)
| Designation | Operating agent | Scope note |
|---|---|---|
| Director of PMO, Program Manager | `project-manager` / `delivery-manager` (client programs) | internal programs → project-manager; client → delivery-manager |
| Technical Project Manager, Scrum Master, Agile Coach | `project-manager` | sprint delivery, ceremonies, coaching |
| Delivery Manager | `delivery-manager` | the archetype at its home level (client delivery) |
| Release Manager | `devops` / `project-manager` | release coordination |

## Sales & Revenue  → `sales-delivery` dept
| Designation | Operating agent | Scope note |
|---|---|---|
| CRO, VP Sales, Sales Director | `sales` (lead) / `ceo` | revenue strategy & quota ownership |
| Enterprise Account Executive, Account Executive | `sales` | discovery → proposal → close (drafts; human sends/signs) |
| SDR / BDR | `sdr` | top of funnel, lead-gen & qualification |
| Sales Engineer / Solutions Architect (Pre-Sales) | `solutions-architect` | technical scoping & estimation |
| Partnerships Manager | `sales` / `account-manager` | partner/channel relationships |
| Sales Operations Analyst, Revenue Operations Manager | `sales` + `finance` + `data-analyst` | pipeline hygiene & rev metrics — **RevOps is a candidate future agent** if this thins the archetypes |

## Marketing  → `marketing-support` dept
| Designation | Operating agent | Scope note |
|---|---|---|
| CMO, Head of Marketing | `marketing` (lead) / `ceo` | positioning & demand strategy |
| Product Marketing Manager | `marketing` (+ `product-manager`) | messaging tied to the product |
| Demand Generation Manager, Content Marketing Manager, SEO/SEM Specialist | `marketing` | campaigns, content, search |
| Social Media Manager | `social-media` | the archetype at its home level |
| Marketing Ops | `marketing` / `data-analyst` | attribution & funnel tooling |
| Brand Manager | `marketing` / `designer` | brand consistency |
| Events Manager | `marketing` | event programs |

## Customer Success & Support  → `sales-delivery` (CS) + `marketing-support` (support)
| Designation | Operating agent | Scope note |
|---|---|---|
| VP Customer Success | `account-manager` (lead) / `ceo` | retention & expansion strategy |
| Customer Success Manager, Renewals Manager | `account-manager` | health, QBRs, renewals, upsell |
| Onboarding Specialist, Implementation Consultant | `delivery-manager` / `account-manager` | go-live & onboarding |
| Support Manager | `support` (lead) | support ops & quality |
| Technical Support Engineer (L1/L2/L3) | `support` | one agent, ascending depth; L3 loops `developer`/`ml-engineer` |

## Finance  → `people-finance` dept
| Designation | Operating agent | Scope note |
|---|---|---|
| CFO | `finance` (lead) / `ceo` | financial strategy — **decisions are human-gated** |
| Finance Controller, Finance Manager, FP&A Analyst | `finance` | budgets, forecasting, models |
| Accountant, Accounts Payable/Receivable Executive, Payroll Specialist, Billing Analyst | `finance` | prepares; money movement is human-gated |

## People / HR  → `people-finance` dept
| Designation | Operating agent | Scope note |
|---|---|---|
| CHRO, Head of HR | `hr` (lead) / `ceo` | people strategy & policy |
| HR Business Partner, HR Generalist, HR Operations Executive | `hr` | day-to-day people operations |
| Talent Acquisition Lead, Technical Recruiter | `hr` | sourcing → screen → loop → scorecard |
| L&D Manager, Compensation & Benefits Specialist | `hr` | development & comp frameworks (decisions human-gated, dual w/ CEO) |

## Legal & Compliance  → `operations` dept
| Designation | Operating agent | Scope note |
|---|---|---|
| General Counsel, Corporate Counsel | `legal-counsel` (+ `ceo`; external counsel for binding advice) | contract review & risk — **prepares; a human/attorney decides** |
| Contracts Manager | `legal-counsel` (+ `sales`/`finance`) | redlines, obligations register |
| Data Protection Officer (DPO) | `legal-counsel` (+ `security`) | DPDP/GDPR data-protection program |
| Compliance Manager | `legal-counsel` (+ `security`) | SOC 2 / ISO 27001 evidence & gaps |

## IT & Admin  → `operations` dept
| Designation | Operating agent | Scope note |
|---|---|---|
| IT Manager, IT Support Engineer, Network Administrator | `it-admin` (+ `devops` at the prod boundary) | internal IT, accounts, endpoints, network |
| Office Manager, Facilities Executive | `it-admin` | workplace & facilities operations |
| Executive Assistant | `it-admin` (+ `chief-of-staff` for routing) | scheduling & coordination |

## Executive
The C-suite is **authority held by human seats** (today the Founder-Operator), with an archetype agent that *prepares* the work at that level. The agent drafts; the human decides at the gate.
| Designation | Prepares (agent) | Decides (human seat) |
|---|---|---|
| CEO | `ceo` | Founder (CEO seat — terminal backstop) |
| COO | `chief-of-staff` / `ceo` | Founder |
| CTO | `eng-manager` / `security` / `ceo` | Founder (Engineering head + CEO) |
| CIO | `it-admin` / `devops` / `ceo` | Founder |
| CPO | `product-manager` / `ceo` | Founder (Product & Design head) |
| CFO | `finance` / `ceo` | Founder (People & Finance head) |
| CRO | `sales` / `ceo` | Founder (Sales & Delivery head) |
| CMO | `marketing` / `ceo` | Founder (Marketing & Support head) |
| CHRO | `hr` / `ceo` | Founder (People & Finance head, dual w/ CEO) |
| VP-level leaders | the department's lead/manager agent | the department Head seat |
| Board / Advisors | — | humans (Founder + external) |

---

## Human seats vs AI agents

Every **approval gate** in `routing.md` is held by a **human seat**, not an agent. When this catalog maps a chief/VP designation to an agent, the agent **prepares and recommends**; the equivalent human authority (Approver / Deputy / Head / CEO per `departments.md`) **decides**. Today every seat is the Founder-Operator (the n=1 state). Hiring hands seats over one department at a time (Plan 001 D1.5) — the designations above are the ladder those hires fill.

## Gaps & growth notes

- **Closed by this catalog** (net-new archetype agents): **`ml-engineer`** (Data & AI build), **`it-admin`** (IT & Admin), **`legal-counsel`** (Legal & Compliance) — previously these functions mapped to nobody.
- **Mapped to existing archetypes, watch for thinning** — if any of these becomes a heavy, distinct workload, it's the next candidate agent: **RevOps / Sales Ops** (today `sales`+`finance`+`data-analyst`), **UX Research** (today `designer`+`data-analyst`), **Product Marketing** (today `marketing`+`product-manager`).
- **Role SOPs pending** for the three new agents (`docs/sop/roles/ml-engineer.md`, `it-admin.md`, `legal-counsel.md`) — follow-up per the plan; charters reference them per house convention.
- **Not a licensed function:** `legal-counsel` and the CFO/finance line **prepare** work; binding legal advice, signatures, and money movement remain human — an AI agent never substitutes for an attorney or an accountant of record.
