FROM node:20-alpine AS base

# Stage 1: Install dependencies for all workspaces
FROM base AS deps
WORKDIR /app

# Copy root config
COPY package.json package-lock.json* ./

# Copy shared package
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared/tsconfig.json ./packages/shared/

# Copy worker package
COPY apps/worker/package.json ./apps/worker/

# Install all dependencies
RUN npm ci --ignore-scripts

# Stage 2: Build
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps ./apps

# Build shared package first
RUN cd packages/shared && npm run build || true

# Build worker
RUN npm run build --workspace=apps/worker

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

# Copy built artifacts and node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/package.json ./package.json

# Copy shared dist
COPY --from=builder /app/packages/shared/dist ./node_modules/@rsushop/shared/dist

USER worker
# Workers don't expose ports (they connect to Redis)
CMD ["node", "dist/index.js"]
