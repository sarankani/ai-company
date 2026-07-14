/** @type {import('next').NextConfig} */
const nextConfig = {
  // The panel is a stateless client of the repo (ADR-0002): no DB, no client tokens.
  poweredByHeader: false,
  // Self-contained server bundle for container hosts (EX-207 Dockerfile).
  // Vercel ignores this and uses its own build — harmless either way.
  output: "standalone",
};
export default nextConfig;
