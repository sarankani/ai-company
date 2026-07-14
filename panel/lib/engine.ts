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

  // dual approval: the people gate needs a department stamp AND a ceo stamp
  let done = true;
  if (inp.outcome === "approved" && DUAL_GATES.has(String(data.gate))) {
    const oks = stamps.filter((s) => s.outcome === "approved");
    const byId = new Map(inp.humans.map((h) => [h.id, h]));
    const haveCeo = oks.some((s) => isCeo(byId.get(String(s.by))));
    const deptIds = new Set(
      inp.humans
        .filter((h) => h.roles.some((r) => r.department === data.department && CHAIN.includes(r.seat)))
        .map((h) => h.id),
    );
    const haveDept = oks.some((s) => deptIds.has(String(s.by)));
    done = haveCeo && haveDept && oks.length >= 2;
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
