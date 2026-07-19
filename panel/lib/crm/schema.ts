/**
 * Drizzle schema for the CRM database (Tech Spec 002 §2.1, ADR-0008).
 * The `search` tsvector column is DB-generated and intentionally not
 * declared here — queries reach it via sql fragments in store.ts.
 */
import { pgTable, text, jsonb, timestamp, bigint, index, primaryKey } from "drizzle-orm/pg-core";

export const crmRecords = pgTable(
  "crm_records",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    stage: text("stage").notNull(),
    owner: text("owner").notNull(),
    accountId: text("account_id"),
    summary: text("summary").notNull().default(""),
    fields: jsonb("fields").$type<Record<string, string | number | null>>().notNull().default({}),
    aprId: text("apr_id"),
    pendingStage: text("pending_stage"),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("crm_records_type_stage").on(t.type, t.stage),
    index("crm_records_account").on(t.accountId),
    index("crm_records_owner").on(t.owner),
    index("crm_records_updated").on(t.updatedAt),
  ],
);

export const crmLinks = pgTable(
  "crm_links",
  {
    fromId: text("from_id").notNull().references(() => crmRecords.id),
    toId: text("to_id").notNull().references(() => crmRecords.id),
    rel: text("rel").notNull(),
  },
  (t) => [primaryKey({ columns: [t.fromId, t.toId, t.rel] }), index("crm_links_to").on(t.toId)],
);

export const crmActivities = pgTable(
  "crm_activities",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    recordId: text("record_id").notNull().references(() => crmRecords.id),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    actor: text("actor").notNull(),
    kind: text("kind").notNull(), // created | updated | stage | comment | gate
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index("crm_activities_record").on(t.recordId, t.at)],
);

export const crmNotifications = pgTable(
  "crm_notifications",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    recipient: text("recipient").notNull(), // human id or AI-employee id
    kind: text("kind").notNull(), // stage | gate | comment | assigned
    recordId: text("record_id").references(() => crmRecords.id),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [index("crm_notifications_recipient").on(t.recipient, t.createdAt)],
);

export type CrmNotificationRow = typeof crmNotifications.$inferSelect;
export type CrmRecordRow = typeof crmRecords.$inferSelect;
export type CrmLinkRow = typeof crmLinks.$inferSelect;
export type CrmActivityRow = typeof crmActivities.$inferSelect;
