/** Apply pending CRM migrations: `npm run db:migrate` (uses DATABASE_URL,
 * or the zero-setup local PGlite directory when unset). */
import { crmDb, crmDbUrl } from "../lib/crm/db";
import { migrateCrmDb } from "../lib/crm/migrate";

async function main() {
  const db = await crmDb();
  const applied = await migrateCrmDb(db);
  console.log(`[db-migrate] ${crmDbUrl().replace(/\/\/[^@]*@/, "//***@")}`);
  console.log(applied.length ? `[db-migrate] applied: ${applied.join(", ")}` : "[db-migrate] up to date");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
