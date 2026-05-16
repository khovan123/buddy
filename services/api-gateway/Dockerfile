FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json turbo.json ./
COPY libs/ ./libs/
COPY services/api-gateway/package.json ./services/api-gateway/
RUN npm install --omit=dev --legacy-peer-deps

FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps
RUN npx turbo run build --filter=api-gateway...

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
USER nestjs
ENV NODE_ENV=production SERVICE_NAME=api-gateway
COPY --from=builder --chown=nestjs:nodejs /app/services/api-gateway/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/libs ./libs
COPY --from=deps    --chown=nestjs:nodejs /app/node_modules ./node_modules
EXPOSE 3000
STOPSIGNAL SIGTERM
CMD ["node", "dist/src/main.js"]
