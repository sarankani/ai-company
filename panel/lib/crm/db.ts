/**
 * CRM database handle (ADR-0008). One Postgres dialect, two drivers,
 * selected from DATABASE_URL:
 *   pglite://<dir> | pglite://memory → PGlite, in-process (tests, zero-setup dev)
 *   postgres://…                     → node-postgres Pool — production is the
 *                                      Supabase Postgres (use the pooled
 *                                      connection string on serverless).
 *
 * Unset DATABASE_URL falls back to a PGlite directory next to the panel so
 * `npm run dev` works with zero setup; production must set a real URL.
 * The handle is a module/global singleton (Next.js hot reload safe).
 * Supabase Realtime is a separate, optional layer (lib/crm/notify.ts + the
 * panel bell) — the DB path here is plain Postgres either way.
 */
import path from "path";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type CrmDb = PgDatabase<any, typeof schema>;

const g = globalThis as unknown as { __crmDb?: Promise<CrmDb> };

export function crmDbUrl(): string {
  return process.env.DATABASE_URL || `pglite://${path.resolve(process.cwd(), ".crm-data")}`;
}

async function connect(): Promise<CrmDb> {
  const url = crmDbUrl();
  if (url.startsWith("pglite://")) {
    const target = url.slice("pglite://".length);
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = target === "memory" ? new PGlite() : new PGlite(target);
    const db = drizzle(client, { schema }) as unknown as CrmDb;
    // PGlite is the zero-setup path (dev default, unit + e2e fixtures) —
    // auto-apply migrations so `npm run dev` and test clones just work.
    // Real Postgres stays explicit: run `npm run db:migrate` deliberately.
    const { migrateCrmDb } = await import("./migrate");
    await migrateCrmDb(db);
    return db;
  }
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  // Hosted Postgres (Supabase) requires TLS, but its chain isn't in Node's
  // CA store — so for any non-local host default to TLS without CA
  // verification (Supabase's own node-postgres guidance). Opt out with
  // ?sslmode=disable (e.g. a plain Docker postgres by hostname).
  const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
  const ssl = /sslmode=disable/.test(url) || local ? undefined : { rejectUnauthorized: false };
  // Supabase's pooled endpoint (supavisor) handles serverless connection
  // churn; keep the per-instance pool tiny.
  return drizzle(new Pool({ connectionString: url, max: 3, ssl }), { schema }) as unknown as CrmDb;
}

export function crmDb(): Promise<CrmDb> {
  if (!g.__crmDb) g.__crmDb = connect();
  return g.__crmDb;
}

/** Test hook: drop the singleton so the next crmDb() reconnects. */
export function resetCrmDb(): void {
  g.__crmDb = undefined;
}
