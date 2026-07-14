/**
 * Write-side engine semantics (EX-203) — a TypeScript port of the decision
 * paths of scripts/approval_engine.py, kept in deliberate lockstep:
 * same authorization rule, same stamp shape, same dual-approval logic, same
 * body rewrite, same dump format (so a record decided from the panel is
 * byte-compatible with one decided from the CLI).
 *
 * Nothing here touches the filesystem or network — pure functions over
 * parsed records. Committing is lib/write.ts's job.
 */
import { createHash } from "crypto";
import { parseRecord, type RecordData, type InlineDict, type Scalar } from "./records";
import type { Human } from "./org";
import { authorized } from "./org";

export const DUAL_GATES = new Set(["people"]); // dept stamp AND ceo stamp
export const CHAIN = ["approver", "deputy", "head"]; // then: ceo (terminal)

// ---------- dump (lockstep with approval_engine.py dump_val/dump_record) ----------

function dumpVal(v: Scalar): string {
  if (v === null) return "null";
  if (typeof v === "number") return String(v);
  const s = String(v);
  if (s === "") return '""'; // bare empty means "start of a list" to the parser
  if (/[:,{}#]/.test(s) || s !== s.trim()) return '"' + s.replace(/"/g, "'") + '"';
  return s;
}

function dumpInline(d: InlineDict): string {
  return "{" + Object.entries(d).map(([k, v]) => `${k}: ${dumpVal(v)}`).join(", ") + "}";
}

export function dumpRecord(data: RecordData, body: string): string {
  const lines = ["---"];
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) {
      lines.push(`${k}:`);
      for (const item of v) lines.push("  - " + dumpInline(item));
    } else if (v !== null && typeof v === "object") {
      lines.push(`${k}: ${dumpInline(v)}`);
    } else {
      lines.push(`${k}: ${dumpVal(v)}`);
    }
  }
  lines.push("---");
  return lines.join("\n") + "\n" + body;
}

/** Roundtrip guard (same invariant as the Python save()): never emit text the
 * parser reads back differently — corruption must fail loudly, pre-commit. */
export function dumpChecked(data: RecordData, body: string): string {
  const text = dumpRecord(data, body);
  const { data: d2, body: b2 } = parseRecord(text);
  const sameKeys =
    Object.keys(d2).length === Object.keys(data).length &&
    Object.keys(d2).every((k) => k in data);
  if (dumpRecord(d2, b2) !== text || !sameKeys) {
    throw new Error("roundtrip guard: dump/parse not stable — refusing to write");
  }
  return text;
}

// ---------- helpers ----------

export function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Checkout-independent content hash (lockstep with Python artifact_sha):
 * strip a UTF-8 BOM, normalize CRLF, sha256, first 16 hex chars. */
export function contentSha(raw: string): string {
  const normalized = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  return createHash("sha256").update(normalized, "utf8").digest("hex").slice(0, 16);
}

function isCeo(h: Human | undefined): boolean {
  return !!h && h.roles.some((r) => r.seat === "ceo");
}

export class DecisionError extends Error {} // user-caused; safe to show verbatim

// ---------- mutations (each returns the fields the commit needs) ----------

export interface DecideInput {
  by: Human;
  outcome: "approved" | "rejected" | "answered";
  reason?: string;
  conditions?: string;
  /** sha of the artifact file's current content, or "external" — the caller
   * resolves it because only the caller can read the repo. */
  artifactShaNow: string;
  humans: Human[];
  at?: string;
}

export function decide(data: RecordData, body: string, inp: DecideInput): { data: RecordData; body: string; done: boolean } {
  const at = inp.at ?? nowIso();
  if (data.state !== "pending") throw new DecisionError(`record is '${data.state}', not pending`);
  if (!authorized(inp.by, String(data.department)))
    throw new DecisionError(`${inp.by.id} holds no seat in ${data.department} (and is not ceo)`);
  if (inp.outcome === "rejected" && !inp.reason?.trim())
    throw new DecisionError("reject requires a reason");
  if (data.type === "question" && inp.outcome !== "answered")
    throw new DecisionError("questions are resolved with an answer");
  if (data.type === "approval" && inp.outcome === "answered")
    throw new DecisionError("approvals are resolved with approve/reject");

  const stamp: InlineDict = {
    by: inp.by.id, at, outcome: inp.outcome,
    reason: inp.reason ?? "", conditions: inp.conditions ?? "",
  };
  const stamps = data.stamps as InlineDict[];
  stamps.push(stamp);

  // dual approval: the people gate needs a department stamp AND a ceo stamp.
  // EX-206 M3: the two approving stamps must come from DISTINCT humans once
  // the org has ≥2 humans qualified to approve this gate; at n=1 (one human
  // holds both the ceo and people-finance seats) the documented same-human
  // two-stamp behavior stands (EX-008 note b) — otherwise the gate would be
  // unsatisfiable. Separation of duties turns on automatically as we hire.
  let done = true;
  if (inp.outcome === "approved" && DUAL_GATES.has(String(data.gate))) {
    const oks = stamps.filter((s) => s.outcome === "approved");
    const byId = new Map(inp.humans.map((h) => [h.id, h]));
    const ceoStampers = oks.filter((s) => isCeo(byId.get(String(s.by))));
    const deptIds = new Set(
      inp.humans
        .filter((h) => h.roles.some((r) => r.department === data.department && CHAIN.includes(r.seat)))
        .map((h) => h.id),
    );
    const deptStampers = oks.filter((s) => deptIds.has(String(s.by)));
    const haveCeo = ceoStampers.length > 0;
    const haveDept = deptStampers.length > 0;
    const qualified = new Set(
      inp.humans
        .filter((h) => isCeo(h) || h.roles.some((r) => r.department === data.department && CHAIN.includes(r.seat)))
        .map((h) => h.id),
    );
    const distinctOk =
      qualified.size <= 1 || // n=1: same human may co-sign (documented)
      ceoStampers.some((c) => deptStampers.some((d) => d.by !== c.by));
    done = haveCeo && haveDept && oks.length >= 2 && distinctOk;
  }

  if (done) {
    data.state = inp.outcome;
    data.decision = { ...stamp };
    if (inp.outcome === "approved") data.approved_artifact_sha = inp.artifactShaNow;
    body = body.replace(
      "_pending — authorized seat:",
      `**${inp.outcome}** by ${inp.by.id} at ${at}` +
        (inp.reason ? ` — ${inp.reason}` : "") +
        "\n\n_was pending — seat:",
    );
  }
  return { data, body, done };
}

export function delegate(data: RecordData, body: string, by: Human, to: Human, at?: string): { data: RecordData; body: string } {
  const when = at ?? nowIso();
  if (data.state !== "pending") throw new DecisionError(`record is '${data.state}', not pending`);
  for (const [who, label] of [[by, "delegator"], [to, "delegate"]] as const) {
    if (!authorized(who, String(data.department)))
      throw new DecisionError(`${who.id} (${label}) not authorized for ${data.department}`);
  }
  (data.hops as InlineDict[]).push({ at: when, from: String(data.assignee), to: to.id, reason: "manual-delegate" });
  data.assignee = to.id;
  return { data, body };
}

/** Follow-up question: appended to the record's Thread; the item stays
 * pending — asking is not deciding. */
export function followUp(body: string, by: Human, text: string, at?: string): string {
  const when = (at ?? nowIso()).slice(0, 10);
  const line = `- ${when} · ${by.id} (via panel): ${text.trim()}\n`;
  const i = body.indexOf("## Thread");
  if (i === -1) return body.trimEnd() + "\n\n## Thread\n\n" + line;
  const insertAt = body.indexOf("\n", i) + 1;
  // Thread entries append at the end of the section (== end of body)
  return body.slice(0, insertAt) + body.slice(insertAt).trimEnd() + (body.slice(insertAt).trim() ? "\n" : "\n") + line;
}

// ---------- routing + record creation (lockstep with cmd_new) ----------

export const GATE_DEPT: Record<string, string> = {
  "merge-deploy": "engineering",
  "external-comms": "marketing-support",
  money: "people-finance",
  commitments: "sales-delivery",
  people: "people-finance",
  procurement: "operations",
  "revenue-booking": "people-finance",
};

const PRIORITIES: Record<string, { firstH: number; business: boolean }> = {
  P0: { firstH: 2, business: false },
  P1: { firstH: 24, business: true },
  P2: { firstH: 72, business: true },
};

function addBusinessDelta(start: Date, hours: number): Date {
  let days = Math.floor(hours / 24);
  const cur = new Date(start);
  while (days > 0) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    if (cur.getUTCDay() >= 1 && cur.getUTCDay() <= 5) days--;
  }
  cur.setUTCHours(cur.getUTCHours() + (hours % 24));
  while (cur.getUTCDay() === 0 || cur.getUTCDay() === 6) cur.setUTCDate(cur.getUTCDate() + 1);
  return cur;
}

export function slaDueFrom(start: Date, priority: string): string {
  const p = PRIORITIES[priority];
  if (!p) throw new DecisionError(`unknown priority ${priority}`);
  const due = p.business
    ? addBusinessDelta(start, p.firstH)
    : new Date(start.getTime() + p.firstH * 3600_000);
  return due.toISOString().replace(/\.\d{3}Z$/, "Z");
}

const isAvailable = (h: Human) => h.availability === "available";

/** First available seat-holder along the chain; the ceo seat is the terminal
 * backstop even when busy (lockstep with resolve_assignee). */
export function resolveAssignee(humans: Human[], department: string): { assignee: string; pos: number } {
  for (let pos = 0; pos < CHAIN.length; pos++) {
    const holder = humans.find(
      (h) => isAvailable(h) && h.roles.some((r) => r.department === department && r.seat === CHAIN[pos]),
    );
    if (holder) return { assignee: holder.id, pos };
  }
  const ceo = humans.find((h) => h.roles.some((r) => r.department === "leadership" && r.seat === "ceo"));
  return { assignee: ceo?.id ?? "UNASSIGNED", pos: CHAIN.length };
}

export function nextId(type: "approval" | "question", existing: string[], at: string): string {
  const prefix = type === "question" ? "QST" : "APR";
  const stamp = at.slice(0, 10).replace(/-/g, "");
  let seq = 1;
  for (const id of existing) {
    const m = id.match(new RegExp(`^${prefix}-${stamp}-(\\d+)$`));
    if (m) seq = Math.max(seq, parseInt(m[1], 10) + 1);
  }
  return `${prefix}-${stamp}-${String(seq).padStart(3, "0")}`;
}

export interface NewRecordInput {
  type: "approval" | "question";
  gate: string;
  priority: "P0" | "P1" | "P2";
  requestedBy: string;
  artifact: string;
  artifactShaNow: string;
  action: string;
  links?: string;
  summary: string;
  bodyExtra?: string; // extra sections appended after Summary (e.g. Proposed change)
  humans: Human[];
  existingIds: string[];
  at?: string;
}

export function createRecord(inp: NewRecordInput): { id: string; data: RecordData; body: string } {
  const at = inp.at ?? nowIso();
  const department = GATE_DEPT[inp.gate];
  if (!department) throw new DecisionError(`unknown gate ${inp.gate}`);
  const { assignee, pos } = resolveAssignee(inp.humans, department);
  const id = nextId(inp.type, inp.existingIds, at);
  const data: RecordData = {
    id, type: inp.type, state: "pending",
    gate: inp.gate, department, priority: inp.priority,
    requested_by: inp.requestedBy, artifact: inp.artifact,
    artifact_sha: inp.artifactShaNow,
    action: inp.action,
    links: inp.links ?? "",
    created: at, sla_due: slaDueFrom(new Date(at), inp.priority),
    assignee, chain_pos: pos,
    hops: [], notified: [], stamps: [],
    decision: null, execution: null,
  };
  const body =
    `\n## Summary\n\n${inp.summary}\n\n` +
    (inp.bodyExtra ? `${inp.bodyExtra.trim()}\n\n` : "") +
    `## Decision\n\n_pending — authorized seat: ${department} (assignee: ${assignee})_\n\n## Thread\n\n`;
  return { id, data, body };
}

// ---------- execution (lockstep with cmd_claim / cmd_complete) ----------

export function claimExecution(data: RecordData, by: string, artifactShaNow: string, at?: string): void {
  const when = at ?? nowIso();
  if (data.state !== "approved") throw new DecisionError(`record is '${data.state}', not approved`);
  const ex = data.execution as InlineDict | null;
  if (ex?.executed_at) throw new DecisionError("already executed exactly once");
  if (ex?.claimed_at) throw new DecisionError(`already claimed by ${ex.by} — a stale claim goes to a human, never a silent retry`);
  const approvedSha = String(data.approved_artifact_sha ?? "");
  if (approvedSha && approvedSha !== "external" && approvedSha !== artifactShaNow)
    throw new DecisionError("artifact changed since approval — withdraw and re-request (Tech Spec §6)");
  data.execution = { claimed_at: when, by };
}

export function completeExecution(data: RecordData, result: string, at?: string): void {
  const when = at ?? nowIso();
  const ex = data.execution as InlineDict | null;
  if (!ex?.claimed_at) throw new DecisionError("no claim on record — claim before complete");
  if (ex.executed_at) throw new DecisionError("already executed exactly once");
  ex.executed_at = when;
  ex.result = result;
}

// ---------- org-file edits (comment-preserving raw-text surgery) ----------
// humans files carry hand-written comments in their frontmatter, so these
// edits NEVER go through parse/dump (which would strip them) — they are
// targeted line edits, validated by re-parsing afterwards.

export function setAvailabilityRaw(raw: string, availability: "available" | "busy" | "ooo", oooUntil: string | null): string {
  let out = raw.replace(/^(availability:\s*)\S+([^\n]*)$/m, `$1${availability}$2`);
  out = out.replace(/^(ooo_until:\s*)\S+([^\n]*)$/m, `$1${availability === "ooo" ? (oooUntil ?? "null") : "null"}$2`);
  const check = parseRecord(out).data;
  if (check.availability !== availability) throw new DecisionError("availability edit failed validation");
  return out;
}

const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function removeRoleRaw(raw: string, department: string, seat: string): string {
  const re = new RegExp(`^[ \\t]*- \\{department: ${reEsc(department)}, seat: ${reEsc(seat)}\\}[^\\n]*\\n`, "m");
  if (!re.test(raw)) throw new DecisionError(`${department}/${seat} role not found on current holder`);
  return raw.replace(re, "");
}

export function addRoleRaw(raw: string, department: string, seat: string): string {
  const line = `  - {department: ${department}, seat: ${seat}}\n`;
  const m = raw.match(/^roles:[^\n]*\n/m);
  if (!m) throw new DecisionError("no roles list in humans file");
  const idx = raw.indexOf(m[0]) + m[0].length;
  const out = raw.slice(0, idx) + line + raw.slice(idx);
  const roles = parseRecord(out).data.roles as InlineDict[];
  if (!roles.some((r) => r.department === department && r.seat === seat))
    throw new DecisionError("role add failed validation");
  return out;
}

// ---------- seat-change proposals (machine-readable body section) ----------

export interface SeatChange { department: string; seat: string; from: string; to: string }

export function parseSeatChange(body: string): SeatChange | null {
  const sec = body.match(/## Proposed change\n([\s\S]*?)(?=\n## |$)/);
  if (!sec) return null;
  const get = (k: string) => sec[1].match(new RegExp(`^- ${k}: (.+)$`, "m"))?.[1]?.trim();
  if (get("change") !== "seat") return null;
  const department = get("department"), seat = get("seat"), from = get("from"), to = get("to");
  return department && seat && from && to ? { department, seat, from, to } : null;
}

// ---------- registry (lockstep with rebuild_registry) ----------

const BEGIN = "<!-- approvals:begin -->";
const END = "<!-- approvals:end -->";

export function rebuildRegistryText(registry: string, records: { data: RecordData }[]): string {
  const rows = records
    .filter(({ data: d }) => {
      const executed = ((d.execution as InlineDict | null) ?? {})?.executed_at;
      return d.state === "pending" || (d.state === "approved" && !executed);
    })
    .map(({ data: d }) =>
      `| ${d.id} | ${d.type} | ${d.gate} | ${d.department} | ${d.state} | ${d.assignee} | ${d.sla_due} |`);
  const table =
    "| id | type | gate | department | state | assignee | sla_due |\n" +
    "|---|---|---|---|---|---|---|\n" +
    (rows.length ? rows.join("\n") : "| — | — | — | — | — | — | — |");
  const start = registry.indexOf(BEGIN);
  const end = registry.indexOf(END);
  if (start === -1 || end === -1) return registry; // no markers — leave untouched
  return registry.slice(0, start) + BEGIN + "\n" + table + "\n" + END + registry.slice(end + END.length);
}

// ---------- visibility (Tech Spec §7: people-gate restriction) ----------

/** People-gate items are visible only to People & Finance seat-holders and
 * the CEO seat (PRD open question 3, adopted). Everything else: any seat. */
export function canView(me: Human, data: { gate?: unknown }): boolean {
  if (data.gate !== "people") return true;
  return me.roles.some((r) => r.seat === "ceo" || r.department === "people-finance");
}
