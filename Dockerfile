# ─── Stage 1: deps ────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Install turbo globally
RUN npm install -g turbo

# Copy workspace manifests for layer caching
COPY package.json turbo.json ./
COPY libs/common/package.json ./libs/common/
COPY libs/contracts/package.json ./libs/contracts/
COPY libs/testing/package.json ./libs/testing/

ARG SERVICE_NAME
COPY services/${SERVICE_NAME}/package.json ./services/${SERVICE_NAME}/

# Install only production deps
RUN npm install --workspace=libs/common \
  --workspace=libs/contracts \
  --workspace=services/${SERVICE_NAME} \
  --omit=dev \
  --legacy-peer-deps

# ─── Stage 2: builder ─────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g turbo

# Copy everything
COPY . .

ARG SERVICE_NAME

# Install all deps (including devDeps for build)
RUN npm install --legacy-peer-deps

# Build shared libs first, then the service
RUN turbo run build --filter=@libs/common \
  --filter=@libs/contracts \
  --filter=${SERVICE_NAME}

# ─── Stage 3: runner ──────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs \
  && adduser  --system --uid 1001 nestjs
USER nestjs

ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}
ENV NODE_ENV=production

# Copy compiled output
COPY --from=builder --chown=nestjs:nodejs /app/services/${SERVICE_NAME}/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/libs ./libs

# Copy production node_modules
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nestjs:nodejs /app/services/${SERVICE_NAME}/node_modules ./services/${SERVICE_NAME}/node_modules

EXPOSE 3000

# Graceful shutdown support
STOPSIGNAL SIGTERM

CMD ["node", "dist/main.js"]
