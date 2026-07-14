/**
 * Decision ledger (EX-302, PRD US-12): flatten every visible record into a
 * chronological, filterable stream of accountability events — decisions
 * (stamps), reassignments/delegations (hops), and executions. Read-only over
 * the records the viewer may see (People-gate restriction via canView); no new
 * state (ADR-0002). 100% decision coverage: one event per stamp.
 */
import type { ApprovalRecord, InlineDict } from "./records";
import type { Human } from "./org";
import { canView } from "./engine";

export type LedgerKind = "decision" | "reassign" | "execution";

export interface LedgerEvent {
  at: string;
  kind: LedgerKind;
  id: string;          // record id
  gate: string;
  department: string;
  actor: string;       // who acted (stamp.by / hop.to / executor)
  outcome: string;     // approved | rejected | answered | manual-delegate | sla-breach | executed
  detail: string;      // reason / from→to / result
  human: boolean;      // human action (amber) vs system (teal)
}

export interface LedgerFilters {
  department?: string;
  actor?: string;
  gate?: string;
  from?: string; // YYYY-MM-DD inclusive
  to?: string;   // YYYY-MM-DD inclusive
}

export function buildLedger(records: ApprovalRecord[], me: Human, f: LedgerFilters = {}): LedgerEvent[] {
  const events: LedgerEvent[] = [];
  for (const r of records) {
    if (!canView(me, r)) continue; // People-gate restriction
    for (const s of (r.stamps as InlineDict[]) ?? []) {
      events.push({
        at: String(s.at), kind: "decision", id: r.id, gate: r.gate, department: r.department,
        actor: String(s.by), outcome: String(s.outcome),
        detail: [s.reason, s.conditions && `conditions: ${s.conditions}`].filter(Boolean).join(" · "),
        human: true,
      });
    }
    for (const h of (r.hops as InlineDict[]) ?? []) {
      events.push({
        at: String(h.at), kind: "reassign", id: r.id, gate: r.gate, department: r.department,
        actor: String(h.to), outcome: String(h.reason),
        detail: `${h.from} → ${h.to}`,
        human: h.reason === "manual-delegate",
      });
    }
    const ex = r.execution as InlineDict | null;
    if (ex?.executed_at) {
      events.push({
        at: String(ex.executed_at), kind: "execution", id: r.id, gate: r.gate, department: r.department,
        actor: String(ex.by), outcome: "executed", detail: String(ex.result ?? ""), human: false,
      });
    }
  }

  const filtered = events.filter((e) => {
    if (f.department && e.department !== f.department) return false;
    if (f.gate && e.gate !== f.gate) return false;
    if (f.actor && e.actor !== f.actor) return false;
    const day = e.at.slice(0, 10);
    if (f.from && day < f.from) return false;
    if (f.to && day > f.to) return false;
    return true;
  });
  // newest first — a ledger is read most-recent-down
  return filtered.sort((a, b) => b.at.localeCompare(a.at));
}

/** Distinct actors present in the visible corpus (for the filter dropdown). */
export function ledgerActors(records: ApprovalRecord[], me: Human): string[] {
  const s = new Set<string>();
  for (const r of records) {
    if (!canView(me, r)) continue;
    for (const st of (r.stamps as InlineDict[]) ?? []) s.add(String(st.by));
    for (const h of (r.hops as InlineDict[]) ?? []) s.add(String(h.to));
  }
  return [...s].sort();
}
