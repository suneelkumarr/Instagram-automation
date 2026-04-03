FROM node:20-alpine AS base

# Stage 1: Install dependencies for all workspaces
FROM base AS deps
WORKDIR /app

# Copy root config
COPY package.json package-lock.json* ./

# Copy shared package
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/

# Copy api package
COPY apps/api/package.json ./apps/api/

# Install all dependencies (workspace resolution)
RUN npm ci --ignore-scripts

# Stage 2: Build
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps stage (includes all workspaces)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps ./apps

# Build shared package first
RUN cd packages/shared && npm run build || true

# Build API
RUN npm run build --workspace=apps/api

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs

# Copy built artifacts and node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./package.json

# Copy shared dist (needed for imports)
COPY --from=builder /app/packages/shared/dist ./node_modules/@rsushop/shared/dist

USER expressjs
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/index.js"]
