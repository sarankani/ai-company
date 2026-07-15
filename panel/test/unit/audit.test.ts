import { describe, it, expect } from "vitest";
import { buildLedger, ledgerActors } from "../../lib/audit";
import type { ApprovalRecord } from "../../lib/records";
import type { Human } from "../../lib/org";

const human = (id: string, roles: [string, string][]): Human => ({
  id, name: id, email: `${id}@x`, title: "", availability: "available",
  roles: roles.map(([department, seat]) => ({ department, seat })),
});
const approver = human("saravanan-p", [["engineering", "approver"]]);
const ceo = human("saran", [["leadership", "ceo"], ["people-finance", "approver"]]);

const rec = (p: Partial<ApprovalRecord>): ApprovalRecord => ({
  id: "APR-x", type: "approval", state: "pending", gate: "merge-deploy",
  department: "engineering", priority: "P1", requested_by: "developer",
  artifact: "d", action: "a", created: "2026-07-15T09:00:00Z",
  sla_due: "2026-07-16T09:00:00Z", assignee: "saravanan-p", chain_pos: 0,
  hops: [], notified: [], stamps: [], decision: null, execution: null, body: "",
  ...p,
});

const eng = rec({
  id: "APR-eng", gate: "merge-deploy", department: "engineering",
  stamps: [{ by: "saravanan-p", at: "2026-07-15T10:00:00Z", outcome: "approved", reason: "", conditions: "" }],
  hops: [{ at: "2026-07-15T09:30:00Z", from: "saravanan-p", to: "saran", reason: "manual-delegate" }],
  execution: { by: "devops", executed_at: "2026-07-15T11:00:00Z", result: "merged" },
});
const people = rec({
  id: "APR-ppl", gate: "people", department: "people-finance",
  stamps: [{ by: "saran", at: "2026-07-15T10:30:00Z", outcome: "approved", reason: "", conditions: "" }],
});

describe("buildLedger", () => {
  it("emits one event per stamp, hop and execution", () => {
    const ev = buildLedger([eng], ceo);
    const kinds = ev.map((e) => e.kind).sort();
    expect(kinds).toEqual(["decision", "execution", "reassign"]);
  });

  it("is sorted newest-first", () => {
    const ev = buildLedger([eng], ceo);
    expect(ev[0].at >= ev[ev.length - 1].at).toBe(true);
    expect(ev[0].kind).toBe("execution"); // 11:00 is newest
  });

  it("hides people-gate events from a non-people seat", () => {
    const seenByApprover = buildLedger([eng, people], approver);
    expect(seenByApprover.some((e) => e.id === "APR-ppl")).toBe(false);
    const seenByCeo = buildLedger([eng, people], ceo);
    expect(seenByCeo.some((e) => e.id === "APR-ppl")).toBe(true);
  });

  it("filters by gate, actor and date range", () => {
    const both = [eng, people];
    expect(buildLedger(both, ceo, { gate: "people" }).every((e) => e.gate === "people")).toBe(true);
    expect(buildLedger(both, ceo, { actor: "devops" }).map((e) => e.kind)).toEqual(["execution"]);
    expect(buildLedger(both, ceo, { from: "2026-07-16" })).toHaveLength(0);
    expect(buildLedger(both, ceo, { to: "2026-07-14" })).toHaveLength(0);
  });

  it("marks human vs system actions", () => {
    const ev = buildLedger([eng], ceo);
    expect(ev.find((e) => e.kind === "decision")!.human).toBe(true);
    expect(ev.find((e) => e.kind === "execution")!.human).toBe(false);
    expect(ev.find((e) => e.kind === "reassign")!.human).toBe(true); // manual-delegate
  });
});

describe("ledgerActors", () => {
  it("returns the distinct visible actors, sorted", () => {
    expect(ledgerActors([eng], ceo)).toEqual(["saran", "saravanan-p"]);
    // people actor invisible to the engineering approver
    expect(ledgerActors([people], approver)).toEqual([]);
  });
});
