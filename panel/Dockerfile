# Evalyn Control Panel — portable production image (EX-207).
# For container hosts (Fly.io, Render, a VPS, your own infra). Vercel does not
# need this. Multi-stage: install → build → slim standalone runtime.
#
# The panel reads the Company OS in production via the GitHub API
# (GITHUB_REPO + GITHUB_TOKEN), so the repo checkout is NOT baked into the
# image — only the app is.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# SESSION_SECRET is only needed at runtime; a dummy keeps the build's env
# access from throwing. The real secret is injected by the host at run time.
ENV SESSION_SECRET=build-only-not-a-real-secret
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# non-root
RUN useradd --system --uid 1001 evalyn
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER evalyn
EXPOSE 3000
CMD ["node", "server.js"]
