# Buddy - Deployment

## Source Of Truth

Nguon deploy hien tai nen duoc xem la `.github/workflows/ci.yml` va Dockerfiles trong tung service. README van con noi Fly.io/Azure/Vercel theo huong cu; trong CI active, backend deploy len Google Cloud Run. Cac block Azure/Koyeb/build cu bi comment.

## Local Development

Prerequisites suy ra tu `package.json`:

- Node.js `>=20 <23`
- npm `>=10`
- Docker/Docker Compose
- Python runtime cho `recommendation-service` va `rag-service`

Commands:

```bash
npm install
npm run dev:infra
npm run dev:db:push
npm run dev
```

`npm run dev:infra` start:

- RabbitMQ
- MongoDB
- PostgreSQL
- Redis
- Qdrant

If `npm run dev:infra` fails immediately with a port-conflict message, another local container is already publishing one of Buddy's required ports. The most common case is PostgreSQL on `localhost:5432`; stop the conflicting container before rerunning the command.

`docker-compose.yml` cung co Prometheus, Grafana, Jaeger cho local observability.

## Local Infrastructure

`docker-compose.yml` la infra compose, khong phai full application compose. It starts:

| Container | Purpose |
| --- | --- |
| `rabbitmq` | event bus, management UI |
| `mongodb` | document stores |
| `postgres` | transactional stores |
| `redis` | cache/session/history |
| `qdrant` | vector DB |
| `prometheus` | metrics scraping |
| `grafana` | dashboards |
| `jaeger` | tracing |

Local credentials trong compose la dev-only va khong duoc dung production.

## Production-Like Compose Caveat

`docker-compose.prod.yml` khong nen coi la deploy source of truth:

- Khong include day du `interaction-service`, `recommendation-service`, `rag-service`, `webapp`, va mot so infra.
- `content-service` dang set `MONGO_URI: mongodb://mongodb:27017/notification_db`, kha nang sai database.
- Gateway environment chi cau hinh mot phan service URLs.
- File phu hop de tham khao cu, can sua truoc khi dung.

## CI/CD Pipeline

Workflow: `.github/workflows/ci.yml`

Stages:

1. `detect`: dung `dorny/paths-filter` tao service matrix theo changed paths.
2. `test`: backend lint, TypeScript check, unit tests.
3. `webapp`: lint, `mfe:check`, type check, `npm test`.
4. deploy: active backend deploy len Google Cloud Run/Artifact Registry.

Backend test env start PostgreSQL, Redis, RabbitMQ service containers. MongoDB khong thay trong CI test services.

## Google Cloud Run Deployment

Active deploy behavior:

- GCP project: `project-20fe2419-cbae-442e-aea`
- Region: `asia-southeast1`
- Artifact Registry repo: `buddy`
- Build Docker image per changed service.
- Deploy `api-gateway` voi `--allow-unauthenticated`.
- Deploy internal services voi `--no-allow-unauthenticated`.
- Resource flags: `--memory 1Gi --cpu 1 --min-instances 1 --max-instances 1`.

Supported manual dispatch services:

- `all`
- `api-gateway`
- `auth-service`
- `user-service`
- `notification-service`
- `content-service`
- `upload-service`
- `billing-service`
- `content-access-service`
- `interaction-service`
- `recommendation-service`
- `rag-service`

## Webapp Deployment

README va CI comment noi webapp deploy handled by Vercel, nhung workflow hien tai chi lint/test webapp; khong co active Vercel deploy step trong `.github/workflows/ci.yml`. Can xac minh Vercel project settings ngoai repo.

## Required Runtime Configuration

Common:

- `PORT`, `HOST`
- `ALLOWED_ORIGINS`
- `RABBITMQ_URL`
- `REDIS_URL` hoac Redis host/password tu common config
- `OTEL_EXPORTER_OTLP_ENDPOINT`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`

Service-specific:

- PostgreSQL `DATABASE_URL`/host vars cho Prisma services.
- `MONGO_URI` cho Mongo services.
- Supabase S3 credentials/bucket.
- Cloudinary credentials.
- SePay secrets/webhook verification.
- Qdrant URL/API key.
- Gemini/API key cho RAG generation.
- Frontend `NEXT_PUBLIC_API_BASE_URL`, `NEXT_API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, NextAuth secrets.

## Migration Strategy

Current scripts:

- `npm run prisma:generate`
- `npm run prisma:db:push`
- `npm run prisma:migrate:deploy:prod`

CI Cloud Run workflow khong thay migration deploy step active trong phan da doc. `docker-compose.prod.yml` co migrate sidecars cho auth/upload nhung khong bao phu billing/content-access. Production migration process can chuan hoa.

## Deployment Risks

- `max-instances 1` lam he thong khong HA va de bottleneck.
- AI services co cold start nang; min instance 1 giam cold start nhung khong scale.
- Model artifacts/FAISS tren ephemeral filesystem Cloud Run co nguy co mat sau deploy/restart.
- Missing integration/e2e gates truoc deploy.
- Secrets/infra ngoai repo chua duoc document.
- Webapp deploy pipeline khong nam trong repo.
