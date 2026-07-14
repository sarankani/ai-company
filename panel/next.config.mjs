/** @type {import('next').NextConfig} */
const nextConfig = {
  // The panel is a stateless client of the repo (ADR-0002): no DB, no client tokens.
  poweredByHeader: false,
};
export default nextConfig;
