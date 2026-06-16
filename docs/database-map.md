# Buddy - Database Map

## Ownership Rule

Khong service nao nen truy cap database cua service khac truc tiep. Cross-service data can di qua REST/RPC/events. Recommendation/RAG co the doc Mongo catalog nhu read model theo code hien tai, nhung canonical owner van la `content-service`.

## PostgreSQL / Prisma

### auth-service

Schema: `services/auth-service/src/prisma/schema.prisma`

| Model | Purpose |
| --- | --- |
| `User` | identity account, email/password/status/role/verification |
| `RefreshToken` | refresh token rotation/revocation |

Enums: `UserStatus`.

### upload-service

Schema: `services/upload-service/src/prisma/schema.prisma`

| Model | Purpose |
| --- | --- |
| `MediaFile` | uploaded file metadata, content id/type, S3 keys, preview/HLS status |
| `Outbox` | durable event publishing for upload events |

Enums: `MediaProcessingStatus`, `OutboxStatus`.

### billing-service

Schema: `services/billing-service/src/prisma/schema.prisma`

| Model | Purpose |
| --- | --- |
| `Wallet` | balance per user |
| `WalletTransaction` | ledger transactions, external refs, idempotency |
| `Outbox` | durable billing events |
| `UserResourceOwnership` | ownership for purchased resources/content |
| `PayoutAccount` | bank payout metadata |
| `SubscriptionPlanCatalog` | plan limits/features |
| `Subscription` | active user subscription |

Enums: `TransactionType`, `TransactionStatus`, `PaymentProvider`, `ProductType`, `OutboxStatus`, `SubscriptionPlan`, `SubscriptionStatus`, `SubscriptionAudience`.

### content-access-service

Schema: `services/content-access-service/src/prisma/schema.prisma`

| Model | Purpose |
| --- | --- |
| `UserResourceAccess` | access grant per user/resource, unique `(userId, resourceId)` |

Enums: `ResourceType`.

## MongoDB / Mongoose

### user-service

Collections:

- `Users`: profile data mirror/extension.
- `Careers`: career metadata.
- `HighlightSkills`: skill metadata.
- `Follows`: following graph.
- `UserRatings`: rating/review per user.

### content-service

Collections:

- `Tutorials`: tutorial catalog, steps/resources/media/moderation/slug.
- `Resources`: resource catalog, metadata, price, preview, moderation.
- `Collections`: grouped resources/tutorials, discount, type.
- `Courses`: course metadata.
- `Majors`: major metadata.
- `SavedContent`: saved/library-like marker.
- `ProcessedMessages`: idempotency for event consumers.

### notification-service

Collections:

- `Notifications`: user notification records.
- `NotificationPreferences`: per-user preference settings.

### interaction-service

Collections:

- `interactions`: action events, TTL around 90 days.
- `forum_topics`: forum topics.
- `forum_messages`: forum messages/replies.

## Redis

Observed use:

- Recommendation cache for `rec:{userId}:{contentType}:{limit}`.
- RAG chat history/cache through `RAGPipeline`.
- Gateway/common cache/resilience support depending service config.
- Local infra requires Redis password in `docker-compose.yml`.

## Qdrant

Owner: `rag-service`.

- Collection name from RAG config.
- Stores chunk vectors with payload for item id, slug, item type, title, filters.
- Updated by `RAGContentConsumer` from `content.sync` and by `/v1/rag/index`.

## FAISS And Model Artifacts

Owner: `recommendation-service`.

- Two-tower model versions and FAISS ANN index live as artifacts inside service runtime/storage.
- `/model/rebuild-index` rebuilds ANN from catalog items.
- Persistence strategy in Cloud Run must be clarified; ephemeral filesystem can lose artifacts unless mounted/externalized.

## Data Consistency Notes

- Billing/upload use outbox for durable async events.
- Content uses `ProcessedMessages` for idempotent event handling.
- Purchase flow is eventually consistent across billing, content-access, content, notification.
- Content sync to recommendation/RAG is eventually consistent and can lag/fail into DLQ.
- No single global transaction spans services.

