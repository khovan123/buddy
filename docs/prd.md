# Buddy - Reverse-Engineered PRD

## Product Vision

Buddy la production-style learning marketplace ket hop creator economy, content commerce va AI learning assistant. Product giup student nhanh tim duoc tai lieu/tutorial phu hop theo mon hoc, mua/quyen truy cap noi dung, hoi AI tren noi dung hoc tap; giup creator upload, ban va quan ly doanh thu.

## Scope Marking

Trang thai:

- Implemented: co route/schema/UI/test hoac service code ro rang.
- Partial: co mot phan code nhung thieu route parity, tests, deploy hardening, docs hoac workflow end-to-end chua chac.
- Missing: README/feature expectation co nhung code khong thay.
- Unknown: can runtime data/secret/manual validation.

## Feature Matrix

| Feature | Status | Evidence / Gap |
| --- | --- | --- |
| Landing/intro/pricing/about/FAQ | Implemented | `webapp/src/app/(intro)` va intro feature data |
| Authentication register/login/OTP/OAuth/refresh/logout | Implemented | `auth-service` routes va gateway auth proxy |
| NextAuth web session integration | Implemented | `webapp/src/app/api/auth`, `proxy.ts`, auth services |
| User profile update | Implemented | `user-service` `/v1/users/me`, web profile/settings |
| Careers/skills metadata CRUD | Partial | Downstream uses PUT, gateway uses PATCH for update; can mismatch |
| Follow/rating social features | Implemented | `follow.controller`, `rating.controller`; web usage needs broader validation |
| Creator create resource | Implemented | content DTO/controller + web create resource form |
| Creator create tutorial | Implemented | content DTO/controller + tutorial builder/form |
| Creator create collection | Implemented | collection controller + collection builder UI |
| Update tutorial/resource/collection via public gateway | Partial | Downstream has PUT; gateway lacks obvious PUT for tutorial/resource/collection update |
| Delete content | Implemented | gateway delete tutorial/resource, downstream delete |
| Content moderation recheck | Implemented | `/moderation/recheck`, moderation service/tests |
| Course/major metadata | Implemented | content-meta controllers/gateway CRUD |
| Upload confirm/history/status | Partial | Downstream has `/uploads/files/:id/status`; gateway exposes `/uploads/videos/:id` and process route not matching current controller exactly |
| Document preview | Implemented/Partial | upload/content preview code/tests exist; end-to-end runtime unknown |
| Video/HLS processing | Implemented/Partial | upload processing code/schema; production media pipeline needs e2e validation |
| Library purchased content | Implemented | `libraries` routes and web library feature |
| Purchase quote/purchase | Implemented | billing routes, content purchase catalog RPC |
| Wallet top-up/transactions/balance | Implemented | billing routes and web billing UI |
| Payout account/withdraw | Implemented/Partial | routes/UI exist; bank/payment provider runtime unknown |
| Subscription plans/limits | Implemented | Prisma catalog, billing routes, dashboard plan limits |
| PayPal/PayOS | Missing | README stale; code uses SePay |
| SePay deposit/withdraw webhooks | Implemented | billing webhook controller and gateway raw body parsing |
| Access grant after purchase | Implemented | content-access-service purchase e2e and schema |
| Notifications/preferences | Implemented | notification controllers + web notification/settings |
| Realtime notifications | Unknown/Partial | README claims Socket.io; code route/preferences clear, runtime stream details need validation |
| Forum topics/messages/reactions/views | Implemented | interaction-service forum controller + gateway/websocket |
| Interaction tracking | Implemented | `interaction-service` stats/post; web `track-content-view` |
| Recommendation for-you | Implemented | FastAPI `/recommend`, gateway `/recommendations/for-you` composition |
| Trending | Implemented | `/trending`, web trending section |
| ML model training/reload/info | Implemented/Partial | routes exist; auth/ops guard and production artifact persistence unknown |
| RAG ask/retrieve/history | Implemented | FastAPI routers + web RAG chat |
| RAG content indexing | Implemented/Partial | consumer/index route; quality depends on content extraction/vector state |
| SEO metadata/sitemap/robots | Partial | implemented, sitemap TODO for dynamic pages |
| Micro-frontend boundaries | Partial | config/test exist; actual remote deployment unknown |
| Observability | Partial | OpenTelemetry/common + compose Jaeger/Prometheus/Grafana; production dashboards/alerts unknown |
| CI/CD backend | Partial | active Cloud Run deploy exists, but only unit test gate |
| E2E production readiness | Partial/Missing | sample e2e tests; CI does not run e2e |

## Business Rules Suy Ra

- Student phai authenticated de mua, vao private app, hoi RAG, xem library.
- Creator/content creation phu thuoc role/policies va subscription plan limits.
- Content can gan `majorId`, `courseId`; collections gom resources/tutorials.
- Purchase tao ownership/access; duplicate ownership should be idempotent via unique constraints.
- Subscription plans quy dinh storage bytes, max resource/tutorial/collection, creator capability va search limits.
- Moderation status va processed message idempotency ngan lap event.
- Interaction actions co weight cho recommendation: VIEW, LIKE, PURCHASE.

## Non-Functional Requirements

- API gateway phai propagate `x-correlation-id`.
- Gateway phai co validation, CORS, helmet, retries for safe GET, circuit breaker/bulkhead.
- Services phai co health/liveness/readiness phu hop Cloud Run.
- Event consumers phai idempotent, co DLX.
- Billing/upload outbox phai dam bao at-least-once publishing.
- AI services phai fail gracefully khi Redis/model/Qdrant chua ready.

## Unknowns Can Product/Runtime Clarify

- Fee split marketplace, refund policy, payout settlement schedule.
- Exact role model: admin/creator/student mapping and approval flow.
- Moderation policy threshold va manual review process.
- RAG authorization: assistant co chi tra loi tren content da mua hay tren catalog public?
- Recommendation quality metrics accepted for launch.
- Production secrets/storage bucket/Cloudinary folder conventions.

