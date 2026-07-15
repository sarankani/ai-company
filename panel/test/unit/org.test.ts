import { describe, it, expect } from "vitest";
import { authorized, isCeoSeat, isHeadOf, type Human } from "../../lib/org";

const human = (id: string, roles: [string, string][]): Human => ({
  id, name: id, email: `${id}@x`, title: "", availability: "available",
  roles: roles.map(([department, seat]) => ({ department, seat })),
});

const approver = human("saravanan-p", [["engineering", "approver"], ["product-design", "head"]]);
const ceo = human("saran", [["leadership", "ceo"], ["engineering", "head"]]);

describe("authorized", () => {
  it("allows any seat in the department", () => {
    expect(authorized(approver, "engineering")).toBe(true);
  });
  it("allows the ceo everywhere", () => {
    expect(authorized(ceo, "operations")).toBe(true);
  });
  it("denies a seat in another department", () => {
    expect(authorized(approver, "people-finance")).toBe(false);
  });
});

describe("isCeoSeat", () => {
  it("is true only for the ceo seat", () => {
    expect(isCeoSeat(ceo)).toBe(true);
    expect(isCeoSeat(approver)).toBe(false);
  });
});

describe("isHeadOf", () => {
  it("is true for a department head or the ceo", () => {
    expect(isHeadOf(approver, "product-design")).toBe(true); // head of product-design
    expect(isHeadOf(ceo, "operations")).toBe(true); // ceo is head everywhere
    expect(isHeadOf(approver, "engineering")).toBe(false); // only approver there, not head
  });
});
