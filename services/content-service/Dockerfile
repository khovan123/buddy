FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json turbo.json ./
COPY libs/ ./libs/
COPY services/content-service/package.json ./services/content-service/
RUN npm install --omit=dev --legacy-peer-deps

FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps
RUN npx turbo run build --filter=content-service...

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
USER nestjs
ENV NODE_ENV=production SERVICE_NAME=content-service
COPY --from=builder --chown=nestjs:nodejs /app/services/content-service/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/libs ./libs
COPY --from=deps    --chown=nestjs:nodejs /app/node_modules ./node_modules
EXPOSE 3004
STOPSIGNAL SIGTERM
CMD ["node", "dist/src/main.js"]
