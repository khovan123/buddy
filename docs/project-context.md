# Buddy - Project Context

## Muc Dich Tai Lieu

Tai lieu nay duoc reverse-engineer tu code hien co cua monorepo Buddy. Khi README va code khac nhau, uu tien code. Muc tieu la giup future AI agents nhanh chong hieu product, service boundary, data ownership, event flows, deployment va cac rui ro san sang production.

## Product Overview

Buddy la learning marketplace cho sinh vien va creator. He thong cho phep creator xuat ban `resources`, `tutorials`, `collections`; student kham pha, mua, luu vao library, tuong tac, hoi AI assistant tren noi dung hoc tap va nhan recommendation ca nhan hoa.

Vision suy ra tu code:

- Marketplace tap trung vao tai lieu hoc, video tutorial va collection theo `major`, `course`, `semester`.
- Creator co workflow tao resource, tutorial, collection, theo doi dashboard, wallet, payout va subscription limits.
- Student co workflow browse explore/home, mua bang wallet, xem library, xem preview/document/video, hoi RAG assistant, tham gia forum.
- AI layer gom `rag-service` cho grounded Q&A va `recommendation-service` cho ranking/trending/model lifecycle.

## Personas

| Persona | Nhu cau chinh | Bang chung tu code |
| --- | --- | --- |
| Student | Tim tai lieu, xem preview, mua noi dung, xem library, hoi AI, tuong tac va forum | `webapp/src/app/(private)/explore`, `library`, `rag`, `forum`, `billing`, `interaction-service` |
| Creator | Tao resource/tutorial/collection, upload media, quan ly dashboard, nhan doanh thu, payout | `create-content-modal`, `create-resource-form`, `create-tutorial-form`, `dashboard`, `billing-service` |
| Admin/Operator | Quan ly metadata, plan limits, moderation recheck, model training | `content-meta`, `subscription/plans/:code/limits`, `model/train`, moderation routes |
| Future AI Agent | Bao tri microservices, validate event consistency, update docs/test/deploy | `libs/contracts`, schemas, CI, docs nay |

## Creator Workflows

1. Dang ky/dang nhap qua `auth-service`.
2. Hoan thien profile, career/skills qua `user-service`.
3. Tao content qua `content-service`: `resources`, `tutorials`, `collections`.
4. Upload file/video qua `upload-service`; file metadata luu PostgreSQL, content metadata luu MongoDB.
5. Content moderation/status duoc cap nhat qua consumer va route recheck.
6. Content sync sang `recommendation-service` va `rag-service` qua `content.sync`.
7. Ban noi dung qua `billing-service`; doanh thu vao wallet, co payout account/withdraw.
8. Creator bi gioi han boi subscription plan trong `billing-service` va dashboard plan limits.

## Student Workflows

1. Browse home/explore theo resources, tutorials, collections.
2. Xem detail, preview document, video, metadata uploader, price va purchase CTA.
3. Ghi nhan view/like/save/purchase events qua `interaction-service`.
4. Mua content bang wallet qua `billing-service`; access duoc grant qua `content-access-service`.
5. Noi dung da mua nam trong library qua `content-service` + ownership/access queries.
6. Dat cau hoi voi `rag-service`; response tra `answer`, `sources`, timings, chat history.
7. Tham gia forum qua REST/WebSocket proxied boi `api-gateway`.

## Revenue Model

Code the hien 3 nguon doanh thu/chinh sach:

- Marketplace purchase: `billing-service` xu ly wallet, quote, purchase, seller/buyer, ownership.
- Subscription: `SubscriptionPlanCatalog`, `Subscription`, plan limits gom storage, max resources/tutorials/collections, `canCreateContent`, `maxSearchResults`.
- Payout/withdraw: creator luu payout account, verify bank, rut tien.

README noi PayPal/PayOS nhung code hien uu tien SePay: `sepay-pg-node`, webhook `/v1/webhooks/billing/sepay/deposit|withdraw`, migration `remove_payos_paypal_add_se_pay`.

## AI Assistant Capabilities

`rag-service`:

- FastAPI routers `/v1/rag/ask`, `/retrieve`, `/history`, `/index`, `/health`, `/stats`.
- Retrieval tu Qdrant, chunking + embeddings bang `sentence-transformers`.
- Generation qua Gemini theo naming trong README/code dependencies.
- Redis luu chat history/cache.
- `RAGContentConsumer` sync Qdrant tu `content.sync`.
- Cold-start co warmup/bootstrap index, concurrency bounded, timeout rieng cho embedding/query.

Trang web co `rag-chat-launcher`, `rag-chat`, `rag-source-card`; assistant co citations/sources.

## Recommendation Engine

`recommendation-service`:

- FastAPI routers `/v1/recommendation/recommend`, `/trending`, `/model/train`, `/model/reload`, `/model/versions`, `/model/info`, `/model/rebuild-index`.
- Runtime gom `CatalogStore`, `UserProfileStore`, `ItemPopularityStore`, `ScoringEngine`.
- Rule-based scoring fallback khi chua co trained model.
- TensorFlow/Keras two-tower model va FAISS ANN index khi co artifacts.
- Redis cache recommendation theo user/contentType/limit.
- Consumers sync content/user/interactions tu RabbitMQ; content queue bind `content.sync`.
- Scheduler va `DriftMonitor` theo doi retraining.

## Service Boundaries

| Boundary | Owner | Data owner |
| --- | --- | --- |
| Public API, auth propagation, resilience | `api-gateway` | Khong so huu DB |
| Identity/JWT/OTP/session | `auth-service` | PostgreSQL `users`, `refresh_tokens` |
| Profile/social metadata | `user-service` | MongoDB `Users`, `Follows`, `UserRatings`, `Careers`, `HighlightSkills` |
| Content catalog | `content-service` | MongoDB tutorials/resources/collections/majors/courses/saved/processed messages |
| Upload/media processing | `upload-service` | PostgreSQL `media_files`, `outbox`; external S3/Cloudinary |
| Wallet/payment/subscription | `billing-service` | PostgreSQL wallet/transactions/ownership/subscriptions/outbox |
| Access grant | `content-access-service` | PostgreSQL `user_resource_access` |
| Notifications | `notification-service` | MongoDB notifications/preferences |
| Interactions/forum | `interaction-service` | MongoDB interactions/forum topics/messages |
| Recommendations | `recommendation-service` | MongoDB read models + local model artifacts/FAISS |
| RAG | `rag-service` | Qdrant vector index + Mongo catalog read + Redis history/cache |

## External Integrations

- Supabase S3 compatible storage for uploads/presigned URLs.
- Cloudinary for public thumbnails/previews.
- SePay webhook/payment integration.
- RabbitMQ for events/RPC.
- Redis for cache/session/rate/read models.
- Qdrant for vector search.
- OpenTelemetry/Jaeger/Prometheus/Grafana for observability.
- Vercel for webapp per README comments; active CI only deploys backend services to Google Cloud Run.
- Google Cloud Run + Artifact Registry in active `.github/workflows/ci.yml`.

## Documentation Gaps

- README con nhac Fly.io/Azure/PayPal/PayOS trong khi code/CI hien tai la Cloud Run + SePay.
- Chua co canonical API reference ngoai Swagger runtime cua `api-gateway`.
- Chua co event contract catalog day du theo queue/exchange/producer/consumer.
- Chua co runbook cho DLQ/replay, outbox retry, media worker failure, model training failure.
- Chua co schema ownership map truoc bo tai lieu nay.
- Chua co product roadmap chinh thuc; roadmap duoc suy ra tu unfinished features.

## Known Issues And Technical Debt

- `docker-compose.prod.yml` khong day du 11 services, thieu webapp/AI services va co `content-service` `MONGO_URI` tro toi `notification_db`.
- CI khong chay integration/e2e tests truoc deploy.
- Python services khong co pytest step trong CI.
- Cloud Run deploy set `--max-instances 1`, khong HA/scalable.
- Gateway route coverage chua hoan toan khop downstream: vi du update tutorial/resource/collection va upload `files/:id/status` khong duoc expose dung day du.
- Logging con tron `AppLogger`, Nest logger, Python logging va `console`.
- Mot so route admin/model operations chua thay authorization ro rang o FastAPI layer; phu thuoc gateway/internal access.

## Current Roadmap Suy Ra

- Dong bo README/deployment docs voi Cloud Run + SePay.
- Hoan thien gateway route parity voi downstream controllers.
- Them integration/e2e CI gate va pytest cho Python services.
- Hardening deployment: min/max instances, secrets, readiness, migrations, DLQ runbook.
- Hoan thien monitoring dashboards/alerts va SLO.
- Chinh thuc hoa API/event docs.

