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

main().catch((e) => {
  const msg = String((e as Error)?.message ?? e);
  console.error(`[db-migrate] FAILED: ${msg}`);
  if (/ENETUNREACH|ETIMEDOUT|EHOSTUNREACH/.test(msg)) {
    console.error(
      "[db-migrate] hint: Supabase's direct host (db.<ref>.supabase.co) is IPv6-only — " +
      "use the pooler connection string instead (Dashboard → Connect → Session pooler, " +
      "host like aws-0-<region>.pooler.supabase.com).",
    );
  }
  if (/password authentication|SASL|auth/i.test(msg)) {
    console.error(
      "[db-migrate] hint: check the password and URL-encode special characters in it " +
      "(e.g. @ → %40); pooler URLs need the 'postgres.<project-ref>' username.",
    );
  }
  console.error(e);
  process.exit(1);
});
