/** Apply pending CRM migrations: `npm run db:migrate` (uses DATABASE_URL,
 * or the zero-setup local PGlite directory when unset). */
import { crmDb, crmDbUrl } from "../lib/crm/db";
import { migrateCrmDb } from "../lib/crm/migrate";
import { loadLocalEnv } from "./load-env";

async function main() {
  loadLocalEnv(); // panel/.env.local works on every OS/shell
  if (!process.env.DATABASE_URL) {
    console.log(
      "[db-migrate] NOTE: DATABASE_URL is not set — falling back to the zero-setup " +
      "local PGlite database (dev only). To migrate a real Postgres (Supabase), put " +
      "DATABASE_URL=postgresql://… in panel/.env.local (any OS) or set it in this " +
      "shell (PowerShell: $env:DATABASE_URL=\"…\" · cmd: set \"DATABASE_URL=…\").",
    );
  }
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
