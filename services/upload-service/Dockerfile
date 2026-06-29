FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json turbo.json ./
COPY libs/ ./libs/
COPY services/upload-service/package.json ./services/upload-service/
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx turbo run build --filter=upload-service...
RUN npm prune --omit=dev --legacy-peer-deps

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
USER nestjs
ENV NODE_ENV=production SERVICE_NAME=upload-service
COPY --from=builder --chown=nestjs:nodejs /app/services/upload-service/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/libs ./libs
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/services/upload-service/node_modules ./node_modules
EXPOSE 8080
STOPSIGNAL SIGTERM
CMD ["node", "dist/src/main.js"]
