# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Ubuntu Footprints — backend image.
# Multi-stage so the runtime layer carries only prod deps + source (no pnpm
# store, no dev deps, no build toolchain). Much smaller than a Nixpacks image.
# ─────────────────────────────────────────────────────────────────────────────

# Node 22 (alpine). Bumped 20→22 on 2026-10-23: Node 20 is EOL (Apr 2026) and
# missed the Oct 2026 security release that fixed the Brotli RCE
# (CVE-2026-111497); engines allows ">=20 <23", so 22 is the patched landing
# spot. The floating 22-alpine tag resolves to 22.23.4.
# ---- Base: pinned Node + pnpm (via corepack, version from package.json) ----
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ---- Dependencies: prod-only, resolved from the frozen lockfile ----
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile

# ---- Runtime: clean Node image, no pnpm/corepack, runs unprivileged ----
FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy resolved prod node_modules and application source. .dockerignore keeps
# .env, tests, docs, tmp/ and the local node_modules out of the build context.
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

# Built-in unprivileged user shipped with the node image.
USER node

EXPOSE 5000

# Uses the existing /api/health route (200 when healthy/degraded, 503 when not).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-5000}/api/health" >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
