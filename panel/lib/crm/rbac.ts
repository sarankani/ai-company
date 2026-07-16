/**
 * CRM RBAC (Tech Spec 002 §4.1) — role × department matrix.
 *
 * Access to a record type is derived from the type's owning department
 * (lifecycles.ts) and the human's roles in company/org/humans/:
 *   - ceo seat                          → edit, every department
 *   - approver/deputy/head seat in <d>  → edit on <d>'s types
 *   - {department: <d>, seat: crm-editor} → edit on <d>'s types
 *   - {department: <d>, seat: crm-viewer} → view on <d>'s types
 *   - no grant for <d>                  → none: <d>'s types are hidden
 *
 * CRM grants NEVER confer approval authority — org.ts authorized() only
 * accepts chain/ceo seats. Pure functions; no I/O.
 */
import type { Human } from "../org";
import { CRM_TYPES, LIFECYCLES, type CrmType } from "./lifecycles";

export type CrmAccess = "none" | "view" | "edit";

const CHAIN_SEATS = new Set(["approver", "deputy", "head"]);

/** Access level a human holds over one department's record types. */
export function deptAccess(h: Human, department: string): CrmAccess {
  let access: CrmAccess = "none";
  for (const r of h.roles) {
    if (r.seat === "ceo") return "edit";
    if (r.department !== department) continue;
    if (CHAIN_SEATS.has(r.seat) || r.seat === "crm-editor") return "edit";
    if (r.seat === "crm-viewer") access = "view";
  }
  return access;
}

/** Access level a human holds over one record type. */
export function crmAccess(h: Human, type: CrmType): CrmAccess {
  return deptAccess(h, LIFECYCLES[type].department);
}

/** The record types a human may at least view — drives lists/search/nav. */
export function visibleTypes(h: Human): CrmType[] {
  return CRM_TYPES.filter((t) => crmAccess(h, t) !== "none");
}

export function hasAnyCrmAccess(h: Human): boolean {
  return visibleTypes(h).length > 0;
}

/** True if the human's only relationship to the org is CRM grants (a
 * "member": no chain/ceo seat anywhere). Display-only helper. */
export function isMember(h: Human): boolean {
  return (
    h.roles.length > 0 &&
    h.roles.every((r) => r.seat === "crm-viewer" || r.seat === "crm-editor")
  );
}
