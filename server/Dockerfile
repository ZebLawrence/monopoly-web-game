FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY shared/package.json shared/
COPY server/package.json server/
RUN pnpm install --frozen-lockfile --prod=false

# Build shared + server
FROM deps AS build
COPY shared/ shared/
COPY server/ server/
RUN pnpm --filter shared build 2>/dev/null || true
RUN pnpm --filter server build 2>/dev/null || true

# Production image
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=build /app/shared ./shared
COPY --from=build /app/server ./server
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "server/src/index.ts"]
