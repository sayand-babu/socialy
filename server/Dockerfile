# syntax=docker/dockerfile:1
# ------------------------------------------------------------------------------
# 1. Base Stage: Lightweight Alpine with OpenSSL for Prisma
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat curl

# ------------------------------------------------------------------------------
# 2. Dependencies Stage: Clean Install & Prisma Generation
# ------------------------------------------------------------------------------
FROM base AS dependencies
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# ------------------------------------------------------------------------------
# 3. Production Runner Stage
# ------------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Security: Create and run under a dedicated unprivileged user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

# Copy installed production dependencies and prisma generated artifacts
COPY --from=dependencies --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=dependencies --chown=nodeuser:nodejs /app/prisma ./prisma

# Copy application source code
COPY --chown=nodeuser:nodejs . .

USER nodeuser

EXPOSE 3000

# Docker Health Check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
