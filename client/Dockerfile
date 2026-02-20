FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY shared/package.json shared/
COPY client/package.json client/
RUN pnpm install --frozen-lockfile --prod=false

# Build shared + client
FROM deps AS build
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:3001
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
COPY shared/ shared/
COPY client/ client/
RUN pnpm --filter shared build 2>/dev/null || true
RUN pnpm --filter client build

# Production image
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules
COPY --from=build /app/shared ./shared
COPY --from=build /app/client ./client
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["node_modules/.bin/next", "start", "client/"]
