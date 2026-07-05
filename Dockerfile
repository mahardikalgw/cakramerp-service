# ─────────────────────────────────────────────────────────
# Production Dockerfile for cakramerp-service
# Multi-stage build for minimal image size
# ─────────────────────────────────────────────────────────

# ── Stage 1: Install production dependencies ───────────
FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build application ─────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ── Stage 3: Production runtime ────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Install tini for proper PID 1 signal handling
RUN apk add --no-cache tini

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./

# Copy built application (includes compiled migrations in dist/)
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

USER appuser

EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health/live || exit 1

ENTRYPOINT ["/sbin/tini", "--"]

# Default: run the application.
# Migrations are executed automatically and blocking during startup (see src/main.ts).
# You can still run migrations only with: node dist/database/migrate.js
CMD ["node", "dist/main.js"]
