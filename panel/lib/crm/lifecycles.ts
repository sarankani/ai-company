/**
 * CRM lifecycle map (Tech Spec 002 §2.3) — the single TS source of truth for
 * the 16 business-record entity types from guides/company-os.md: stages,
 * allowed transitions, which transitions stop at a human gate (mapped to the
 * approval engine's GATE_DEPT gate ids), the owning department (RBAC §4.1),
 * and the detail fields each type's forms render.
 *
 * Pure data + pure functions — no I/O. store.ts enforces it on every write.
 */

export const CRM_TYPES = [
  "accounts", "contacts", "leads", "opportunities", "estimates", "quotes",
  "proposals", "pos", "projects", "sows", "milestones", "invoices",
  "tickets", "vendors", "purchase-orders-out", "assets",
] as const;

export type CrmType = (typeof CRM_TYPES)[number];

export interface CrmField {
  key: string;
  label: string;
  kind: "text" | "number" | "date" | "textarea";
}

export interface Lifecycle {
  prefix: string;            // id prefix: LEAD-20260716-001
  label: string;             // singular, human-readable
  plural: string;
  department: string;        // owning department (RBAC + gate context)
  defaultOwner: string;      // AI employee who usually works this type
  hasAccount: boolean;       // whether records link to an account
  stages: readonly string[];
  transitions: Record<string, readonly string[]>; // stage -> allowed next
  /** "from->to" -> gate id (must be a key of engine.ts GATE_DEPT) */
  gates?: Record<string, string>;
  fields: readonly CrmField[];
}

const f = (key: string, label: string, kind: CrmField["kind"] = "text"): CrmField => ({ key, label, kind });

export const LIFECYCLES: Record<CrmType, Lifecycle> = {
  accounts: {
    prefix: "ACC", label: "Account", plural: "Accounts",
    department: "sales-delivery", defaultOwner: "account-manager", hasAccount: false,
    stages: ["prospect", "active", "dormant", "churned"],
    transitions: {
      prospect: ["active", "dormant"],
      active: ["dormant", "churned"],
      dormant: ["active", "churned"],
      churned: ["prospect"],
    },
    fields: [f("industry", "Industry"), f("website", "Website"), f("region", "Region"), f("notes", "Notes", "textarea")],
  },
  contacts: {
    prefix: "CON", label: "Contact", plural: "Contacts",
    department: "sales-delivery", defaultOwner: "sales", hasAccount: true,
    stages: ["active", "left-company", "do-not-contact"],
    transitions: {
      active: ["left-company", "do-not-contact"],
      "left-company": ["active"],
      "do-not-contact": [],
    },
    fields: [f("email", "Email"), f("phone", "Phone"), f("role", "Role/Title"), f("notes", "Notes", "textarea")],
  },
  leads: {
    prefix: "LEAD", label: "Lead", plural: "Leads",
    department: "sales-delivery", defaultOwner: "sdr", hasAccount: true,
    stages: ["new", "contacted", "qualified", "disqualified"],
    transitions: {
      new: ["contacted", "disqualified"],
      contacted: ["qualified", "disqualified"],
      qualified: [],
      disqualified: ["new"],
    },
    fields: [f("source", "Source"), f("contact_email", "Contact email"), f("angle", "Outreach angle", "textarea"), f("icp_fit", "ICP fit notes", "textarea")],
  },
  opportunities: {
    prefix: "OPP", label: "Opportunity", plural: "Opportunities",
    department: "sales-delivery", defaultOwner: "sales", hasAccount: true,
    stages: ["discovery", "scoping", "proposal", "negotiation", "won", "lost"],
    transitions: {
      discovery: ["scoping", "lost"],
      scoping: ["proposal", "lost"],
      proposal: ["negotiation", "lost"],
      negotiation: ["won", "lost"],
      won: [],
      lost: ["discovery"],
    },
    gates: { "negotiation->won": "commitments" },
    fields: [f("value", "Est. value", "number"), f("currency", "Currency"), f("close_date", "Target close", "date"), f("need", "Customer need", "textarea")],
  },
  estimates: {
    prefix: "EST", label: "Estimate", plural: "Estimates",
    department: "sales-delivery", defaultOwner: "solutions-architect", hasAccount: true,
    stages: ["draft", "reviewed", "approved"],
    transitions: { draft: ["reviewed"], reviewed: ["approved", "draft"], approved: [] },
    fields: [f("effort_days", "Effort (days)", "number"), f("cost", "Cost", "number"), f("assumptions", "Assumptions", "textarea"), f("risks", "Risks", "textarea")],
  },
  quotes: {
    prefix: "QUO", label: "Quote", plural: "Quotes",
    department: "sales-delivery", defaultOwner: "finance", hasAccount: true,
    stages: ["draft", "approved", "sent", "accepted"],
    transitions: { draft: ["approved"], approved: ["sent", "draft"], sent: ["accepted"], accepted: [] },
    gates: { "approved->sent": "external-comms" },
    fields: [f("price", "Price", "number"), f("currency", "Currency"), f("margin", "Margin %", "number"), f("valid_until", "Valid until", "date")],
  },
  proposals: {
    prefix: "PRO", label: "Proposal", plural: "Proposals",
    department: "sales-delivery", defaultOwner: "sales", hasAccount: true,
    stages: ["draft", "sent", "signed"],
    transitions: { draft: ["sent"], sent: ["signed", "draft"], signed: [] },
    gates: { "draft->sent": "external-comms" },
    fields: [f("version", "Version"), f("doc_link", "Document link"), f("terms", "Key terms", "textarea")],
  },
  pos: {
    prefix: "PO", label: "Customer PO", plural: "Customer POs",
    department: "people-finance", defaultOwner: "finance", hasAccount: true,
    stages: ["received", "verified", "booked"],
    transitions: { received: ["verified"], verified: ["booked"], booked: [] },
    gates: { "verified->booked": "revenue-booking" },
    fields: [f("po_number", "PO number"), f("amount", "Amount", "number"), f("currency", "Currency"), f("terms", "Payment terms")],
  },
  projects: {
    prefix: "PRJ", label: "Project", plural: "Projects",
    department: "sales-delivery", defaultOwner: "delivery-manager", hasAccount: true,
    stages: ["kickoff", "in-delivery", "uat", "delivered", "closed"],
    transitions: {
      kickoff: ["in-delivery"],
      "in-delivery": ["uat"],
      uat: ["delivered", "in-delivery"],
      delivered: ["closed"],
      closed: [],
    },
    gates: { "kickoff->in-delivery": "commitments" },
    fields: [f("start_date", "Start", "date"), f("end_date", "Target end", "date"), f("team", "Team"), f("status_notes", "Status notes", "textarea")],
  },
  sows: {
    prefix: "SOW", label: "SOW", plural: "SOWs",
    department: "sales-delivery", defaultOwner: "delivery-manager", hasAccount: true,
    stages: ["draft", "sent", "signed"],
    transitions: { draft: ["sent"], sent: ["signed", "draft"], signed: [] },
    gates: { "draft->sent": "external-comms" },
    fields: [f("version", "Version"), f("doc_link", "Document link"), f("change_control", "Change control", "textarea")],
  },
  milestones: {
    prefix: "MIL", label: "Milestone", plural: "Milestones",
    department: "sales-delivery", defaultOwner: "delivery-manager", hasAccount: true,
    stages: ["planned", "in-progress", "delivered", "accepted", "invoiced"],
    transitions: {
      planned: ["in-progress"],
      "in-progress": ["delivered"],
      delivered: ["accepted", "in-progress"],
      accepted: ["invoiced"],
      invoiced: [],
    },
    gates: { "delivered->accepted": "money" },
    fields: [f("due_date", "Due", "date"), f("amount", "Billing amount", "number"), f("acceptance_criteria", "Acceptance criteria", "textarea")],
  },
  invoices: {
    prefix: "INV", label: "Invoice", plural: "Invoices",
    department: "people-finance", defaultOwner: "finance", hasAccount: true,
    stages: ["draft", "sent", "paid", "overdue"],
    transitions: { draft: ["sent"], sent: ["paid", "overdue"], overdue: ["paid"], paid: [] },
    gates: { "draft->sent": "money" },
    fields: [f("amount", "Amount", "number"), f("currency", "Currency"), f("due_date", "Due", "date"), f("po_ref", "PO reference")],
  },
  tickets: {
    prefix: "TIC", label: "Ticket", plural: "Tickets",
    department: "marketing-support", defaultOwner: "support", hasAccount: true,
    stages: ["new", "triaged", "in-progress", "resolved", "closed"],
    transitions: {
      new: ["triaged"],
      triaged: ["in-progress"],
      "in-progress": ["resolved"],
      resolved: ["closed", "in-progress"],
      closed: [],
    },
    fields: [f("severity", "Severity"), f("reported_by", "Reported by"), f("repro", "Reproduction", "textarea"), f("resolution", "Resolution", "textarea")],
  },
  vendors: {
    prefix: "VEN", label: "Vendor", plural: "Vendors",
    department: "operations", defaultOwner: "procurement", hasAccount: false,
    stages: ["prospective", "approved", "active"],
    transitions: { prospective: ["approved"], approved: ["active"], active: [] },
    fields: [f("service", "Service"), f("contact", "Contact"), f("contract_end", "Contract end", "date"), f("risk_notes", "Risk notes", "textarea")],
  },
  "purchase-orders-out": {
    prefix: "POUT", label: "Purchase Order (out)", plural: "Purchase Orders (out)",
    department: "operations", defaultOwner: "procurement", hasAccount: false,
    stages: ["requested", "approved", "ordered", "received"],
    transitions: { requested: ["approved"], approved: ["ordered"], ordered: ["received"], received: [] },
    gates: { "approved->ordered": "procurement" },
    fields: [f("vendor_ref", "Vendor"), f("amount", "Amount", "number"), f("currency", "Currency"), f("need", "Need", "textarea")],
  },
  assets: {
    prefix: "AST", label: "Asset", plural: "Assets",
    department: "operations", defaultOwner: "procurement", hasAccount: false,
    stages: ["procured", "allocated", "in-use", "retired"],
    transitions: { procured: ["allocated"], allocated: ["in-use"], "in-use": ["retired"], retired: [] },
    fields: [f("kind", "Kind (license/device/cloud)"), f("assigned_to", "Assigned to"), f("renewal_date", "Renewal", "date"), f("cost", "Cost", "number")],
  },
};

export class CrmError extends Error {} // user-caused; safe to show verbatim

export function lifecycleOf(type: string): Lifecycle {
  const lc = (LIFECYCLES as Record<string, Lifecycle>)[type];
  if (!lc) throw new CrmError(`unknown record type '${type}'`);
  return lc;
}

export function isCrmType(type: string): type is CrmType {
  return (CRM_TYPES as readonly string[]).includes(type);
}

/** Valid next stages from `stage` for `type` (empty = terminal). */
export function nextStages(type: CrmType, stage: string): readonly string[] {
  return lifecycleOf(type).transitions[stage] ?? [];
}

/** Gate id for a transition, or null if it's ungated. */
export function gateFor(type: CrmType, from: string, to: string): string | null {
  return lifecycleOf(type).gates?.[`${from}->${to}`] ?? null;
}

export function assertTransition(type: CrmType, from: string, to: string): void {
  if (!nextStages(type, from).includes(to)) {
    throw new CrmError(`invalid transition for ${type}: '${from}' → '${to}'`);
  }
}

export function typeByPrefix(prefix: string): CrmType | null {
  for (const t of CRM_TYPES) if (LIFECYCLES[t].prefix === prefix) return t;
  return null;
}

/** Resolve a record id like 'INV-20260716-001' to its type, or null. */
export function typeOfId(id: string): CrmType | null {
  const m = id.match(/^([A-Z]+)-\d{8}-\d{3,}$/);
  return m ? typeByPrefix(m[1]) : null;
}
