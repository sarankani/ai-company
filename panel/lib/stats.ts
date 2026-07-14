/**
 * Dashboard aggregation (EX-204, PRD US-5/6): every number is computed from
 * the records the viewer is allowed to see — People-gate items are filtered
 * out BEFORE counting, so restricted work is absent from tiles, not redacted.
 * No extra store (ADR-0002): aggregation over the read layer only.
 */
import type { ApprovalRecord } from "./records";
import type { Human } from "./org";
import { canView } from "./engine";

export interface DeptStats {
  waiting: number;       // pending human decisions (amber — the dominant number)
  oldestWaitingH: number | null; // age of the oldest pending item, in hours
  wip: number;           // approved, awaiting execution (AI work in flight)
  escalations: number;   // pending items that have hopped at least once
  deliveredWeek: number; // decided in the last 7 days
}

const WEEK_MS = 7 * 24 * 3600_000;

export function visibleTo(me: Human, records: ApprovalRecord[]): ApprovalRecord[] {
  return records.filter((r) => canView(me, r));
}

export function deptStats(records: ApprovalRecord[], dept: string, now: Date): DeptStats {
  const rs = records.filter((r) => r.department === dept);
  const pending = rs.filter((r) => r.state === "pending");
  const oldest = pending.length
    ? Math.max(...pending.map((r) => now.getTime() - new Date(r.created).getTime()))
    : null;
  return {
    waiting: pending.length,
    oldestWaitingH: oldest === null ? null : Math.floor(oldest / 3600_000),
    wip: rs.filter((r) => r.state === "approved" && !r.execution?.executed_at).length,
    escalations: pending.filter((r) => r.hops.length > 0).length,
    deliveredWeek: rs.filter(
      (r) => r.state !== "pending" && r.decision?.at &&
        now.getTime() - new Date(String(r.decision.at)).getTime() < WEEK_MS,
    ).length,
  };
}

/** US-6: everything that escalated its way to this human — never buried. */
export function escalatedTo(records: ApprovalRecord[], humanId: string): ApprovalRecord[] {
  return records
    .filter((r) => r.state === "pending" && r.assignee === humanId && r.hops.length > 0)
    .sort((a, b) => a.sla_due.localeCompare(b.sla_due));
}
