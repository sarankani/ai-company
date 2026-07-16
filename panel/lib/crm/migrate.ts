/**
 * Minimal forward-only migrator: applies panel/drizzle/*.sql in lexical
 * order, tracking applied files in crm_migrations. Used by
 * scripts/db-migrate.ts, the test fixtures, and dev auto-migrate for the
 * zero-setup PGlite database. Statements are split on blank-line-terminated
 * semicolons — keep migration files one statement per paragraph.
 */
import { promises as fs } from "fs";
import path from "path";
import { sql } from "drizzle-orm";
import type { CrmDb } from "./db";

export async function migrateCrmDb(db: CrmDb, dir = path.resolve(process.cwd(), "drizzle")): Promise<string[]> {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS crm_migrations (
    name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const done = new Set(
    ((await db.execute(sql`SELECT name FROM crm_migrations`)) as { rows: { name: string }[] }).rows.map((r) => r.name),
  );
  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const raw = await fs.readFile(path.join(dir, file), "utf8");
    const statements = raw
      .split(/;\s*\n\s*\n/) // one statement per paragraph
      .map((s) => s.replace(/;\s*$/, "").trim())
      .filter((s) => s && !s.split("\n").every((l) => l.trim().startsWith("--")));
    for (const statement of statements) await db.execute(sql.raw(statement));
    await db.execute(sql`INSERT INTO crm_migrations (name) VALUES (${file})`);
    applied.push(file);
  }
  return applied;
}
