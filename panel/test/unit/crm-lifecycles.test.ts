import { describe, it, expect } from "vitest";
import {
  CRM_TYPES, LIFECYCLES, lifecycleOf, nextStages, gateFor, assertTransition,
  isCrmType, typeOfId, typeByPrefix, CrmError,
} from "../../lib/crm/lifecycles";
import { GATE_DEPT } from "../../lib/engine";

describe("lifecycle map integrity (EX-702)", () => {
  it("covers exactly the 16 Company OS entity types", () => {
    expect(CRM_TYPES).toHaveLength(16);
    expect(new Set(CRM_TYPES).size).toBe(16);
  });

  it("prefixes are unique and roundtrip through typeByPrefix/typeOfId", () => {
    const prefixes = CRM_TYPES.map((t) => LIFECYCLES[t].prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
    for (const t of CRM_TYPES) {
      expect(typeByPrefix(LIFECYCLES[t].prefix)).toBe(t);
      expect(typeOfId(`${LIFECYCLES[t].prefix}-20260716-001`)).toBe(t);
    }
    expect(typeOfId("NOPE-20260716-001")).toBeNull();
    expect(typeOfId("LEAD-2026-01")).toBeNull();
  });

  for (const t of CRM_TYPES) {
    describe(t, () => {
      const lc = LIFECYCLES[t];
      it("stages are unique and transitions stay inside them", () => {
        expect(lc.stages.length).toBeGreaterThan(1);
        expect(new Set(lc.stages).size).toBe(lc.stages.length);
        for (const [from, tos] of Object.entries(lc.transitions)) {
          expect(lc.stages).toContain(from);
          for (const to of tos) {
            expect(lc.stages).toContain(to);
            expect(to).not.toBe(from);
          }
        }
        // every stage has an entry (terminal stages: empty array)
        for (const s of lc.stages) expect(lc.transitions[s]).toBeDefined();
      });

      it("gates reference real engine gate ids over real transitions", () => {
        for (const [key, gate] of Object.entries(lc.gates ?? {})) {
          const [from, to] = key.split("->");
          expect(lc.transitions[from]).toContain(to);
          expect(Object.keys(GATE_DEPT)).toContain(gate);
        }
      });

      it("department + default owner are set", () => {
        expect(lc.department).toMatch(/^[a-z-]+$/);
        expect(lc.defaultOwner).toBeTruthy();
        expect(new Set(lc.fields.map((f) => f.key)).size).toBe(lc.fields.length);
      });
    });
  }

  it("the 8 money/commitment transitions from Tech Spec 002 §2.3 are gated", () => {
    expect(gateFor("quotes", "approved", "sent")).toBe("external-comms");
    expect(gateFor("proposals", "draft", "sent")).toBe("external-comms");
    expect(gateFor("pos", "verified", "booked")).toBe("revenue-booking");
    expect(gateFor("opportunities", "negotiation", "won")).toBe("commitments");
    expect(gateFor("projects", "kickoff", "in-delivery")).toBe("commitments");
    expect(gateFor("milestones", "delivered", "accepted")).toBe("money");
    expect(gateFor("invoices", "draft", "sent")).toBe("money");
    expect(gateFor("purchase-orders-out", "approved", "ordered")).toBe("procurement");
  });

  it("validation helpers behave", () => {
    expect(isCrmType("leads")).toBe(true);
    expect(isCrmType("nonsense")).toBe(false);
    expect(() => lifecycleOf("nonsense")).toThrow(CrmError);
    expect(nextStages("leads", "new")).toEqual(["contacted", "disqualified"]);
    expect(() => assertTransition("leads", "new", "qualified")).toThrow(/invalid transition/);
    expect(() => assertTransition("leads", "new", "contacted")).not.toThrow();
    expect(gateFor("leads", "new", "contacted")).toBeNull();
  });
});
