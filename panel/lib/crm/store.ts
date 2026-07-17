/**
 * CRM store (Tech Spec 002 §4) — the ONLY write path to the CRM database.
 * Enforces, in one place: RBAC (rbac.ts), lifecycle/transition validation
 * (lifecycles.ts), id allocation (ids.ts), and the append-only activity log
 * (every mutation writes its activity row in the same transaction).
 *
 * Gated transitions are not applied here: transitionCrmRecord() reports the
 * gate and gates.ts (EX-706) drives the APR round-trip via the *Internal
 * helpers below. No other module may move a gated stage.
 */
import { and, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import type { Human } from "../org";
import { crmDb } from "./db";
import {
  crmRecords, crmLinks, crmActivities, crmNotifications,
  type CrmRecordRow, type CrmActivityRow, type CrmNotificationRow,
} from "./schema";
import { nextCrmId } from "./ids";
import {
  CrmError, lifecycleOf, assertTransition, gateFor, isCrmType, typeOfId,
  type CrmType,
} from "./lifecycles";
import { crmAccess, visibleTypes, type CrmAccess } from "./rbac";

export type CrmActor = { kind: "human"; human: Human } | { kind: "agent"; id: string };

export function actorId(actor: CrmActor): string {
  return actor.kind === "human" ? actor.human.id : actor.id;
}

/** Agents act as editors everywhere — the gates, not RBAC, protect the
 * critical transitions. Humans get the §4.1 matrix. */
function access(actor: CrmActor, type: CrmType): CrmAccess {
  return actor.kind === "agent" ? "edit" : crmAccess(actor.human, type);
}

function requireView(actor: CrmActor, type: CrmType): void {
  if (access(actor, type) === "none")
    throw new CrmError(`${actorId(actor)} has no access to ${type}`);
}

function requireEdit(actor: CrmActor, type: CrmType): void {
  if (access(actor, type) !== "edit")
    throw new CrmError(`${actorId(actor)} has no editor access to ${type}`);
}

export interface CrmFieldValues {
  [k: string]: string | number | null;
}

/** Keep only keys the lifecycle declares; coerce blanks to null. */
function cleanFields(type: CrmType, input: CrmFieldValues | undefined): CrmFieldValues {
  const out: CrmFieldValues = {};
  if (!input) return out;
  const declared = new Map(lifecycleOf(type).fields.map((f) => [f.key, f.kind]));
  for (const [k, v] of Object.entries(input)) {
    const kind = declared.get(k);
    if (!kind) continue;
    if (v === null || v === "" || v === undefined) { out[k] = null; continue; }
    if (kind === "number") {
      const n = Number(v);
      if (Number.isNaN(n)) throw new CrmError(`field '${k}' must be a number`);
      out[k] = n;
    } else {
      out[k] = String(v);
    }
  }
  return out;
}

/** Queue in-app notifications (deduped, never to the acting identity).
 * Rows land in crm_notifications — the panel bell reads them and Supabase
 * Realtime (when configured) pushes the INSERTs live; agents poll via the
 * API/CLI. Same transaction as the mutation that caused them. */
async function notifyTx(
  tx: { insert: CrmDb["insert"] },
  recipients: (string | null | undefined)[],
  kind: string, recordId: string, message: string, exclude: string,
): Promise<void> {
  const targets = [...new Set(recipients.filter((r): r is string => !!r && r !== exclude))];
  if (!targets.length) return;
  await tx.insert(crmNotifications).values(
    targets.map((recipient) => ({ recipient, kind, recordId, message })),
  );
}

type CrmDb = Awaited<ReturnType<typeof crmDb>>;

async function assertAccountExists(db: Awaited<ReturnType<typeof crmDb>>, accountId: string): Promise<void> {
  const rows = await db.select({ id: crmRecords.id }).from(crmRecords)
    .where(and(eq(crmRecords.id, accountId), eq(crmRecords.type, "accounts"))).limit(1);
  if (!rows.length) throw new CrmError(`account '${accountId}' not found`);
}

// ---------- create ----------

export interface NewCrmRecord {
  title: string;
  summary?: string;
  owner?: string;
  accountId?: string | null;
  fields?: CrmFieldValues;
}

export async function createCrmRecord(type: CrmType, input: NewCrmRecord, actor: CrmActor): Promise<CrmRecordRow> {
  requireEdit(actor, type);
  const lc = lifecycleOf(type);
  const title = input.title?.trim();
  if (!title) throw new CrmError("title is required");
  const accountId = input.accountId?.trim() || null;
  if (accountId && !lc.hasAccount) throw new CrmError(`${type} records don't link to an account`);
  const db = await crmDb();
  if (accountId) await assertAccountExists(db, accountId);
  const by = actorId(actor);
  const fields = cleanFields(type, input.fields);
  // id allocation races with concurrent writers — retry on pk conflict
  for (let attempt = 0; ; attempt++) {
    const id = await nextCrmId(db, type);
    try {
      return await db.transaction(async (tx) => {
        const [row] = await tx.insert(crmRecords).values({
          id, type, title,
          stage: lc.stages[0],
          owner: input.owner?.trim() || lc.defaultOwner,
          accountId,
          summary: input.summary?.trim() ?? "",
          fields,
          createdBy: by, updatedBy: by,
        }).returning();
        await tx.insert(crmActivities).values({
          recordId: id, actor: by, kind: "created",
          detail: { stage: lc.stages[0] },
        });
        await notifyTx(tx, [row.owner], "assigned", id, `${id} assigned to you: ${title}`, by);
        return row;
      });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "23505" && attempt < 3) continue; // id raced — reallocate
      throw e;
    }
  }
}

// ---------- read ----------

export interface CrmFilters {
  stage?: string;
  owner?: string;
  account?: string;
  q?: string;
}

export async function listCrmRecords(
  type: CrmType, filters: CrmFilters, actor: CrmActor, limit = 200,
): Promise<CrmRecordRow[]> {
  requireView(actor, type);
  const db = await crmDb();
  const conds: SQL[] = [eq(crmRecords.type, type)];
  if (filters.stage) conds.push(eq(crmRecords.stage, filters.stage));
  if (filters.owner) conds.push(eq(crmRecords.owner, filters.owner));
  if (filters.account) conds.push(eq(crmRecords.accountId, filters.account));
  if (filters.q?.trim()) {
    const like = "%" + filters.q.trim() + "%";
    // parenthesized: a bare OR would escape the type/stage conditions and
    // leak rows of types outside the caller's RBAC scope
    conds.push(sql`(${crmRecords.id} ILIKE ${like} OR ${crmRecords.title} ILIKE ${like})`);
  }
  return db.select().from(crmRecords).where(and(...conds))
    .orderBy(desc(crmRecords.updatedAt)).limit(limit);
}

export interface CrmRelated {
  rel: string;
  dir: "out" | "in";
  id: string;
  title: string;
  type: string;
  stage: string;
}

export interface CrmRecordDetail {
  record: CrmRecordRow;
  related: CrmRelated[];
  children: CrmRecordRow[]; // records pointing at this account (account 360)
  activities: CrmActivityRow[];
}

export async function getCrmRecord(id: string, actor: CrmActor): Promise<CrmRecordDetail | null> {
  const db = await crmDb();
  const [record] = await db.select().from(crmRecords).where(eq(crmRecords.id, id)).limit(1);
  if (!record) return null;
  requireView(actor, record.type as CrmType);

  const linkRows = await db.select().from(crmLinks)
    .where(or(eq(crmLinks.fromId, id), eq(crmLinks.toId, id)));
  const otherIds = [...new Set(linkRows.map((l) => (l.fromId === id ? l.toId : l.fromId)))];
  const others = otherIds.length
    ? await db.select().from(crmRecords).where(inArray(crmRecords.id, otherIds))
    : [];
  const byId = new Map(others.map((r) => [r.id, r]));
  const readable = new Set(actor.kind === "agent" ? others.map((r) => r.type) : visibleTypes(actor.human));
  const related: CrmRelated[] = linkRows.flatMap((l) => {
    const otherId = l.fromId === id ? l.toId : l.fromId;
    const other = byId.get(otherId);
    if (!other || !readable.has(other.type)) return [];
    return [{ rel: l.rel, dir: l.fromId === id ? "out" : "in", id: other.id, title: other.title, type: other.type, stage: other.stage }];
  });

  const children = record.type === "accounts"
    ? (await db.select().from(crmRecords).where(eq(crmRecords.accountId, id))
        .orderBy(desc(crmRecords.updatedAt)).limit(100))
        .filter((r) => actor.kind === "agent" || readable.has(r.type))
    : [];

  const activities = await db.select().from(crmActivities)
    .where(eq(crmActivities.recordId, id)).orderBy(desc(crmActivities.at)).limit(100);

  return { record, related, children, activities };
}

// ---------- update ----------

export interface CrmPatch {
  title?: string;
  summary?: string;
  owner?: string;
  accountId?: string | null;
  fields?: CrmFieldValues;
}

export async function updateCrmRecord(id: string, patch: CrmPatch, actor: CrmActor): Promise<CrmRecordRow> {
  const db = await crmDb();
  const [record] = await db.select().from(crmRecords).where(eq(crmRecords.id, id)).limit(1);
  if (!record) throw new CrmError(`record '${id}' not found`);
  const type = record.type as CrmType;
  requireEdit(actor, type);

  const changes: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    if (!patch.title.trim()) throw new CrmError("title cannot be empty");
    changes.title = patch.title.trim();
  }
  if (patch.summary !== undefined) changes.summary = patch.summary.trim();
  if (patch.owner !== undefined && patch.owner.trim()) changes.owner = patch.owner.trim();
  if (patch.accountId !== undefined) {
    const acc = patch.accountId?.trim() || null;
    if (acc && !lifecycleOf(type).hasAccount) throw new CrmError(`${type} records don't link to an account`);
    if (acc) await assertAccountExists(db, acc);
    changes.accountId = acc;
  }
  if (patch.fields !== undefined) {
    changes.fields = { ...(record.fields as CrmFieldValues), ...cleanFields(type, patch.fields) };
  }
  if (!Object.keys(changes).length) return record;

  const by = actorId(actor);
  return db.transaction(async (tx) => {
    const [row] = await tx.update(crmRecords)
      .set({ ...changes, updatedBy: by, updatedAt: new Date() })
      .where(eq(crmRecords.id, id)).returning();
    await tx.insert(crmActivities).values({
      recordId: id, actor: by, kind: "updated",
      detail: { changed: Object.keys(changes) },
    });
    return row;
  });
}

// ---------- transitions ----------

export interface TransitionResult {
  applied: boolean;
  gate: string | null; // set when the move needs an approval first
  record: CrmRecordRow;
}

/**
 * Move a record to its next stage. Ungated transitions apply immediately;
 * gated ones are NOT applied — the caller receives {applied:false, gate} and
 * must run the approval flow (gates.ts), which calls the internal helpers.
 */
export async function transitionCrmRecord(id: string, to: string, actor: CrmActor): Promise<TransitionResult> {
  const db = await crmDb();
  const [record] = await db.select().from(crmRecords).where(eq(crmRecords.id, id)).limit(1);
  if (!record) throw new CrmError(`record '${id}' not found`);
  const type = record.type as CrmType;
  requireEdit(actor, type);
  if (record.aprId)
    throw new CrmError(`'${id}' already has a pending approval (${record.aprId}) — resolve it first`);
  assertTransition(type, record.stage, to);
  const gate = gateFor(type, record.stage, to);
  if (gate) return { applied: false, gate, record };
  const row = await applyStageInternal(id, record.stage, to, actor, null);
  return { applied: true, gate: null, record: row };
}

/** Apply a stage move + activity row (ungated, or gate-approved via gates.ts). */
export async function applyStageInternal(
  id: string, from: string, to: string, actor: CrmActor, aprId: string | null,
): Promise<CrmRecordRow> {
  const db = await crmDb();
  const by = actorId(actor);
  return db.transaction(async (tx) => {
    const [row] = await tx.update(crmRecords)
      .set({ stage: to, aprId: null, pendingStage: null, updatedBy: by, updatedAt: new Date() })
      .where(and(eq(crmRecords.id, id), eq(crmRecords.stage, from))).returning();
    if (!row) throw new CrmError(`'${id}' changed stage concurrently — reload`);
    await tx.insert(crmActivities).values({
      recordId: id, actor: by, kind: "stage",
      detail: aprId ? { from, to, apr_id: aprId } : { from, to },
    });
    await notifyTx(tx, [row.owner, row.createdBy], "stage", id,
      `${id} moved ${from} → ${to}${aprId ? ` (approved via ${aprId})` : ""}`, by);
    return row;
  });
}

/** Park a record behind an approval record (gates.ts, after the APR commit). */
export async function setPendingGateInternal(
  id: string, aprId: string, pendingStage: string, gate: string, actor: CrmActor,
  aprAssignee?: string,
): Promise<CrmRecordRow> {
  const db = await crmDb();
  const by = actorId(actor);
  return db.transaction(async (tx) => {
    const [row] = await tx.update(crmRecords)
      .set({ aprId, pendingStage, updatedBy: by, updatedAt: new Date() })
      .where(and(eq(crmRecords.id, id), sql`${crmRecords.aprId} IS NULL`)).returning();
    if (!row) throw new CrmError(`'${id}' already has a pending approval`);
    await tx.insert(crmActivities).values({
      recordId: id, actor: by, kind: "gate",
      detail: { event: "requested", apr_id: aprId, gate, to: pendingStage },
    });
    await notifyTx(tx, [aprAssignee, row.owner], "gate", id,
      `${aprId} awaits decision: move ${id} to '${pendingStage}' (${gate} gate)`, by);
    return row;
  });
}

/** Clear a pending gate after rejection/withdrawal (gates.ts). */
export async function clearPendingGateInternal(
  id: string, aprId: string, outcome: string, actor: CrmActor,
): Promise<CrmRecordRow> {
  const db = await crmDb();
  const by = actorId(actor);
  return db.transaction(async (tx) => {
    const [row] = await tx.update(crmRecords)
      .set({ aprId: null, pendingStage: null, updatedBy: by, updatedAt: new Date() })
      .where(and(eq(crmRecords.id, id), eq(crmRecords.aprId, aprId))).returning();
    if (!row) throw new CrmError(`'${id}' is not pending on ${aprId}`);
    await tx.insert(crmActivities).values({
      recordId: id, actor: by, kind: "gate",
      detail: { event: outcome, apr_id: aprId },
    });
    await notifyTx(tx, [row.owner, row.createdBy], "gate", id,
      `${aprId} ${outcome} — ${id} stays in '${row.stage}'`, by);
    return row;
  });
}

// ---------- links & comments ----------

export async function addCrmLink(fromId: string, rel: string, toId: string, actor: CrmActor): Promise<void> {
  if (!rel.trim() || !/^[a-z0-9-]+$/.test(rel.trim()))
    throw new CrmError("rel must be a short kebab-case label, e.g. estimate-of");
  if (fromId === toId) throw new CrmError("cannot link a record to itself");
  const db = await crmDb();
  const rows = await db.select().from(crmRecords).where(inArray(crmRecords.id, [fromId, toId]));
  const from = rows.find((r) => r.id === fromId);
  const to = rows.find((r) => r.id === toId);
  if (!from) throw new CrmError(`record '${fromId}' not found`);
  if (!to) throw new CrmError(`record '${toId}' not found`);
  requireEdit(actor, from.type as CrmType);
  requireView(actor, to.type as CrmType);
  const by = actorId(actor);
  await db.transaction(async (tx) => {
    await tx.insert(crmLinks).values({ fromId, toId, rel: rel.trim() }).onConflictDoNothing();
    await tx.insert(crmActivities).values({
      recordId: fromId, actor: by, kind: "updated",
      detail: { linked: toId, rel: rel.trim() },
    });
  });
}

export async function addCrmComment(id: string, text: string, actor: CrmActor): Promise<void> {
  if (!text.trim()) throw new CrmError("comment cannot be empty");
  const db = await crmDb();
  const [record] = await db.select().from(crmRecords).where(eq(crmRecords.id, id)).limit(1);
  if (!record) throw new CrmError(`record '${id}' not found`);
  requireEdit(actor, record.type as CrmType);
  const by = actorId(actor);
  await db.transaction(async (tx) => {
    await tx.insert(crmActivities).values({
      recordId: id, actor: by, kind: "comment",
      detail: { text: text.trim().slice(0, 4000) },
    });
    await notifyTx(tx, [record.owner, record.createdBy], "comment", id,
      `${by} commented on ${id}: ${text.trim().slice(0, 140)}`, by);
  });
}

// ---------- notifications ----------

export async function listCrmNotifications(
  recipient: string, opts: { unreadOnly?: boolean } = {}, limit = 50,
): Promise<CrmNotificationRow[]> {
  const db = await crmDb();
  const conds: SQL[] = [eq(crmNotifications.recipient, recipient)];
  if (opts.unreadOnly) conds.push(sql`${crmNotifications.readAt} IS NULL`);
  return db.select().from(crmNotifications).where(and(...conds))
    .orderBy(desc(crmNotifications.createdAt), desc(crmNotifications.id)).limit(limit);
}

export async function unreadCrmCount(recipient: string): Promise<number> {
  const db = await crmDb();
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(crmNotifications)
    .where(and(eq(crmNotifications.recipient, recipient), sql`${crmNotifications.readAt} IS NULL`));
  return row?.n ?? 0;
}

/** Mark the recipient's notifications read (all, or specific ids). */
export async function markCrmNotificationsRead(recipient: string, ids?: number[]): Promise<void> {
  const db = await crmDb();
  const conds: SQL[] = [eq(crmNotifications.recipient, recipient), sql`${crmNotifications.readAt} IS NULL`];
  if (ids?.length) conds.push(inArray(crmNotifications.id, ids));
  await db.update(crmNotifications).set({ readAt: new Date() }).where(and(...conds));
}

// ---------- search & overview ----------

export async function searchCrm(q: string, actor: CrmActor, limit = 30): Promise<CrmRecordRow[]> {
  const types = actor.kind === "agent" ? null : visibleTypes(actor.human);
  if (types && !types.length) return [];
  if (!q.trim()) return [];
  const db = await crmDb();
  const conds: SQL[] = [
    sql`(search @@ plainto_tsquery('simple', ${q.trim()}) OR ${crmRecords.id} ILIKE ${"%" + q.trim() + "%"})`,
  ];
  if (types) conds.push(inArray(crmRecords.type, types));
  return db.select().from(crmRecords).where(and(...conds))
    .orderBy(desc(crmRecords.updatedAt)).limit(limit);
}

export interface CrmOverviewRow {
  type: CrmType;
  stage: string;
  count: number;
}

export async function crmOverview(actor: CrmActor): Promise<CrmOverviewRow[]> {
  const types = actor.kind === "agent" ? null : visibleTypes(actor.human);
  if (types && !types.length) return [];
  const db = await crmDb();
  const rows = await db
    .select({ type: crmRecords.type, stage: crmRecords.stage, count: sql<number>`count(*)::int` })
    .from(crmRecords)
    .where(types ? inArray(crmRecords.type, types) : undefined)
    .groupBy(crmRecords.type, crmRecords.stage);
  return rows.filter((r): r is CrmOverviewRow => isCrmType(r.type));
}

export interface CrmActivityFeedRow extends CrmActivityRow {
  recordTitle: string;
  recordType: string;
}

export async function recentCrmActivities(actor: CrmActor, limit = 20): Promise<CrmActivityFeedRow[]> {
  const types = actor.kind === "agent" ? null : visibleTypes(actor.human);
  if (types && !types.length) return [];
  const db = await crmDb();
  const rows = await db
    .select({
      id: crmActivities.id, recordId: crmActivities.recordId, at: crmActivities.at,
      actor: crmActivities.actor, kind: crmActivities.kind, detail: crmActivities.detail,
      recordTitle: crmRecords.title, recordType: crmRecords.type,
    })
    .from(crmActivities)
    .innerJoin(crmRecords, eq(crmActivities.recordId, crmRecords.id))
    .where(types ? inArray(crmRecords.type, types) : undefined)
    .orderBy(desc(crmActivities.at), desc(crmActivities.id))
    .limit(limit);
  return rows as CrmActivityFeedRow[];
}

/** Resolve the panel route for a record id (used by the item page for crm: artifacts). */
export function crmRouteForId(id: string): string | null {
  const type = typeOfId(id);
  return type ? `/crm/${type}/${id}` : null;
}
