/** @type {import('next').NextConfig} */
const nextConfig = {
  // Governance records stay a stateless client of the repo (ADR-0002);
  // CRM business records live in Postgres (ADR-0008).
  poweredByHeader: false,
  // Native/WASM DB drivers must not be bundled by the server compiler:
  // PGlite loads its WASM from disk and pg has optional native bindings.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // Self-contained server bundle for CONTAINER hosts (EX-207 Dockerfile).
  // Must be OFF on Vercel: `output: "standalone"` writes to .next/standalone,
  // which trips Vercel's output detection ("No Output Directory named public").
  // Vercel builds Next natively and sets VERCEL=1, so scope standalone to
  // non-Vercel builds only.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};
export default nextConfig;
