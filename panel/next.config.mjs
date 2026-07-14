/** @type {import('next').NextConfig} */
const nextConfig = {
  // The panel is a stateless client of the repo (ADR-0002): no DB, no client tokens.
  poweredByHeader: false,
  // Self-contained server bundle for CONTAINER hosts (EX-207 Dockerfile).
  // Must be OFF on Vercel: `output: "standalone"` writes to .next/standalone,
  // which trips Vercel's output detection ("No Output Directory named public").
  // Vercel builds Next natively and sets VERCEL=1, so scope standalone to
  // non-Vercel builds only.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
};
export default nextConfig;
