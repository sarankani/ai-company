/**
 * CRM id allocation — human-readable, stable ids in the same shape as the
 * approval records (engine.ts nextId): <PREFIX>-<yyyymmdd>-<seq3>.
 * Allocation reads the current max sequence for the type+day; the caller
 * (store.createRecord) retries on a primary-key race.
 */
import { like, desc } from "drizzle-orm";
import type { CrmDb } from "./db";
import { crmRecords } from "./schema";
import { lifecycleOf, type CrmType } from "./lifecycles";

export function dateStamp(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10).replace(/-/g, "");
}

export async function nextCrmId(db: CrmDb, type: CrmType, at: Date = new Date()): Promise<string> {
  const prefix = lifecycleOf(type).prefix;
  const stamp = dateStamp(at);
  const rows = await db
    .select({ id: crmRecords.id })
    .from(crmRecords)
    .where(like(crmRecords.id, `${prefix}-${stamp}-%`))
    .orderBy(desc(crmRecords.id))
    .limit(1);
  let seq = 1;
  const m = rows[0]?.id.match(new RegExp(`^${prefix}-${stamp}-(\\d+)$`));
  if (m) seq = parseInt(m[1], 10) + 1;
  return `${prefix}-${stamp}-${String(seq).padStart(3, "0")}`;
}
