# ─── Stage 1: deps ────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Improve npm reliability in CI/Docker
RUN npm config set registry https://registry.npmjs.org/ \
  && npm config set fetch-retries 10 \
  && npm config set fetch-retry-factor 2 \
  && npm config set fetch-retry-mintimeout 30000 \
  && npm config set fetch-retry-maxtimeout 180000 \
  && npm config set fetch-timeout 600000 \
  && npm config set maxsockets 5

# Install turbo globally
RUN npm install -g turbo --no-audit --no-fund

# Copy workspace manifests for layer caching
COPY package.json package-lock.json turbo.json ./
COPY libs/common/package.json ./libs/common/
COPY libs/contracts/package.json ./libs/contracts/
COPY libs/testing/package.json ./libs/testing/

ARG SERVICE_NAME
COPY services/${SERVICE_NAME}/package.json ./services/${SERVICE_NAME}/

# Install production deps from root lockfile/workspaces
RUN npm ci --omit=dev --legacy-peer-deps --no-audit --no-fund

# ─── Stage 2: builder ─────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

# Copy everything
COPY . .

ARG SERVICE_NAME

# Install devDeps for build, reusing deps layer/cache
RUN npm ci --legacy-peer-deps --no-audit --no-fund

# Build shared libs first, then the service
RUN turbo run build \
  --filter=@libs/common \
  --filter=@libs/contracts \
  --filter=${SERVICE_NAME}

# ─── Stage 3: runner ──────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nestjs

ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}
ENV NODE_ENV=production

# Copy compiled output
COPY --from=builder --chown=nestjs:nodejs /app/services/${SERVICE_NAME}/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/libs ./libs

# Copy production node_modules
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules

USER nestjs

EXPOSE 8080

# Graceful shutdown support
STOPSIGNAL SIGTERM

CMD ["node", "dist/src/main.js"]