import { describe, it, expect } from "vitest";
import { deptStats, visibleTo, escalatedTo } from "../../lib/stats";
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
  artifact: "d", action: "a", created: "2026-07-15T00:00:00Z",
  sla_due: "2026-07-16T00:00:00Z", assignee: "saravanan-p", chain_pos: 0,
  hops: [], notified: [], stamps: [], decision: null, execution: null, body: "",
  ...p,
});

const NOW = new Date("2026-07-15T12:00:00Z");

describe("deptStats", () => {
  it("counts waiting, wip, escalations, oldest age and weekly throughput", () => {
    const records = [
      rec({ id: "a", state: "pending", created: "2026-07-15T00:00:00Z" }), // 12h old
      rec({ id: "b", state: "pending", created: "2026-07-15T06:00:00Z", hops: [{ at: "x", from: "u", to: "v", reason: "unavailable-skip" }] }),
      rec({ id: "c", state: "approved", execution: null }), // wip
      rec({ id: "d", state: "approved", execution: { executed_at: "2026-07-15T01:00:00Z" } as any, decision: { at: "2026-07-15T01:00:00Z" } as any }),
      rec({ id: "e", state: "rejected", decision: { at: "2026-07-15T02:00:00Z" } as any }),
      rec({ id: "f", department: "operations", state: "pending" }), // other dept — ignored
    ];
    const s = deptStats(records, "engineering", NOW);
    expect(s.waiting).toBe(2);
    expect(s.oldestWaitingH).toBe(12);
    expect(s.wip).toBe(1); // 'c' approved, unexecuted
    expect(s.escalations).toBe(1); // 'b' has a hop
    expect(s.deliveredWeek).toBe(2); // 'd' + 'e' decided this week
  });

  it("reports null oldest age when nothing is waiting", () => {
    const s = deptStats([rec({ state: "approved" })], "engineering", NOW);
    expect(s.waiting).toBe(0);
    expect(s.oldestWaitingH).toBeNull();
  });
});

describe("visibleTo", () => {
  it("filters out people-gate records for non-people seats", () => {
    const records = [rec({ id: "m", gate: "merge-deploy" }), rec({ id: "p", gate: "people", department: "people-finance" })];
    expect(visibleTo(approver, records).map((r) => r.id)).toEqual(["m"]);
    expect(visibleTo(ceo, records).map((r) => r.id).sort()).toEqual(["m", "p"]);
  });
});

describe("escalatedTo", () => {
  it("returns pending, hopped items assigned to the human, by SLA", () => {
    const records = [
      rec({ id: "late", state: "pending", assignee: "saran", hops: [{ at: "x", from: "u", to: "saran", reason: "sla-breach" }], sla_due: "2026-07-16T00:00:00Z" }),
      rec({ id: "early", state: "pending", assignee: "saran", hops: [{ at: "x", from: "u", to: "saran", reason: "sla-breach" }], sla_due: "2026-07-15T18:00:00Z" }),
      rec({ id: "no-hop", state: "pending", assignee: "saran" }), // never escalated
      rec({ id: "other", state: "pending", assignee: "someone", hops: [{ at: "x", from: "u", to: "someone", reason: "sla-breach" }] }),
    ];
    expect(escalatedTo(records, "saran").map((r) => r.id)).toEqual(["early", "late"]);
  });
});
