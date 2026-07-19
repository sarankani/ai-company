import { describe, it, expect } from "vitest";
import type { Human } from "../../lib/org";
import { authorized } from "../../lib/org";
import { deptAccess, crmAccess, visibleTypes, hasAnyCrmAccess, isMember } from "../../lib/crm/rbac";
import { CRM_TYPES } from "../../lib/crm/lifecycles";

const human = (roles: { department: string; seat: string }[]): Human => ({
  id: "t", name: "T", email: "t@x.y", title: "", availability: "available", roles,
});

describe("CRM RBAC — role × department matrix (Tech Spec 002 §4.1)", () => {
  it("ceo seat = editor everywhere", () => {
    const ceo = human([{ department: "leadership", seat: "ceo" }]);
    for (const t of CRM_TYPES) expect(crmAccess(ceo, t)).toBe("edit");
  });

  it("chain seats grant implicit editor on their department only", () => {
    const eng = human([{ department: "sales-delivery", seat: "approver" }]);
    expect(crmAccess(eng, "leads")).toBe("edit"); // sales-delivery type
    expect(crmAccess(eng, "invoices")).toBe("none"); // people-finance type
  });

  it("crm-editor / crm-viewer grants scope to their department", () => {
    const m = human([
      { department: "sales-delivery", seat: "crm-editor" },
      { department: "people-finance", seat: "crm-viewer" },
    ]);
    expect(crmAccess(m, "opportunities")).toBe("edit");
    expect(crmAccess(m, "invoices")).toBe("view");
    expect(crmAccess(m, "tickets")).toBe("none"); // marketing-support: no grant
    expect(deptAccess(m, "operations")).toBe("none");
  });

  it("editor grant wins over viewer in the same department", () => {
    const m = human([
      { department: "operations", seat: "crm-viewer" },
      { department: "operations", seat: "crm-editor" },
    ]);
    expect(deptAccess(m, "operations")).toBe("edit");
  });

  it("no grants = nothing visible", () => {
    const nobody = human([]);
    expect(visibleTypes(nobody)).toEqual([]);
    expect(hasAnyCrmAccess(nobody)).toBe(false);
  });

  it("isMember is true only for grant-only humans", () => {
    expect(isMember(human([{ department: "sales-delivery", seat: "crm-viewer" }]))).toBe(true);
    expect(isMember(human([{ department: "sales-delivery", seat: "approver" }]))).toBe(false);
    expect(isMember(human([
      { department: "sales-delivery", seat: "crm-editor" },
      { department: "leadership", seat: "ceo" },
    ]))).toBe(false);
    expect(isMember(human([]))).toBe(false);
  });
});

describe("SECURITY: crm-* grants never confer decide rights (EX-703)", () => {
  it("authorized() rejects members even with a real department", () => {
    const m = human([
      { department: "people-finance", seat: "crm-editor" },
      { department: "people-finance", seat: "crm-viewer" },
    ]);
    expect(authorized(m, "people-finance")).toBe(false);
  });

  it("authorized() still accepts chain seats and ceo", () => {
    expect(authorized(human([{ department: "engineering", seat: "approver" }]), "engineering")).toBe(true);
    expect(authorized(human([{ department: "engineering", seat: "deputy" }]), "engineering")).toBe(true);
    expect(authorized(human([{ department: "engineering", seat: "head" }]), "engineering")).toBe(true);
    expect(authorized(human([{ department: "leadership", seat: "ceo" }]), "engineering")).toBe(true);
    expect(authorized(human([{ department: "operations", seat: "approver" }]), "engineering")).toBe(false);
  });
});
