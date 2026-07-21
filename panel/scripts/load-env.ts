/**
 * Minimal .env loader for the CLI scripts (db-migrate, crm-seed) — so setting
 * DATABASE_URL doesn't depend on shell syntax (PowerShell vs cmd vs bash):
 * put it in panel/.env.local once and every script run picks it up.
 * Real env vars always win; files never override an already-set variable.
 * Next.js loads .env.local for the dev server by itself — this covers the
 * tsx-run scripts only.
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

export function loadLocalEnv(dir = process.cwd()): void {
  for (const name of [".env.local", ".env"]) {
    const p = path.resolve(dir, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m || line.trim().startsWith("#")) continue;
      const [, key, rawValue] = m;
      if (process.env[key] !== undefined) continue; // real env wins
      process.env[key] = rawValue.replace(/^(['"])(.*)\1$/, "$2");
    }
  }
}
