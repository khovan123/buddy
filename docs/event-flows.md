# Buddy - Event Flows

## Messaging Backbone

RabbitMQ la event/RPC backbone. Contracts nam trong `libs/contracts/src/events`. Common exchanges thay trong code:

| Exchange / Key family | Purpose |
| --- | --- |
| `auth.events` | auth user events |
| `user.events` | profile/user RPC/events |
| `upload.events` | upload processing, thumbnail, preview RPC |
| `content.events` | content validation, purchase catalog RPC, moderation |
| `billing.events` | purchase/subscription events |
| `notification.events` | notification commands/events |
| `content.sync` | fanout sync cho recommendation va RAG |
| `dead.letter` | DLX cho failed messages |

## Upload To Content Sync

```mermaid
flowchart LR
  Web[Webapp] --> GW[API Gateway]
  GW --> Upload[upload-service]
  GW --> Content[content-service]
  Upload --> Outbox[(upload outbox)]
  Outbox --> MQ[RabbitMQ upload.events]
  MQ --> ContentConsumer[content-service upload consumers]
  ContentConsumer --> ContentDB[(Mongo content)]
  Content --> Sync[content.sync fanout]
  Sync --> Rec[recommendation-service]
  Sync --> RAG[rag-service/Qdrant]
```

Key events/routing keys:

- `FILE_PROCESSED`
- `FILE_PROCESSING_FAILED`
- `RESOURCE_UPLOAD_COMPLETED`
- `CONTENT_EXTRACTED`
- `THUMBNAIL_UPLOADED`
- `THUMBNAIL_UPLOAD_FAILED`
- Upload RPC keys for presigned URL/history/preview.

## Purchase Flow

```mermaid
flowchart LR
  Student --> GW[API Gateway]
  GW --> Billing[billing-service]
  Billing --> ContentRPC[content-service CONTENT_GET_PURCHASE_CATALOG]
  Billing --> Wallet[(WalletTransaction)]
  Billing --> Outbox[(billing outbox)]
  Outbox --> Purchase[BILLING_PURCHASE_COMPLETED]
  Purchase --> Access[content-access-service grant]
  Purchase --> Content[content-service count/catalog update]
  Purchase --> Notify[notification-service]
  Access --> Compensation[saga compensation if grant fails]
```

Important rules:

- Purchase quote phai lay authoritative catalog/price tu content-service.
- Wallet transaction phai idempotent bang `idempotencyKey`/`externalRef`.
- Ownership/access grant phai idempotent bang unique constraints.
- Compensation/refund events ton tai trong `saga.events.ts`.

## Recommendation Sync

```mermaid
flowchart TB
  Content[content-service] --> Fanout[content.sync]
  Fanout --> RecQueue[recommendation.content.sync]
  Fanout --> RAGQueue[rag.content.sync]
  Interaction[interaction-service] --> RecInteractions[recommendation interactions queue]
  User[user-service] --> RecUser[recommendation user sync queue]
  RecQueue --> RecStore[CatalogStore]
  RecInteractions --> Popularity[ItemPopularityStore/UserProfileStore]
  RecUser --> UserProfile[UserProfileStore]
```

`recommendation-service` accepts:

- `ITEM_UPSERT`
- `ITEM_DELETED`
- user sync events
- interaction events with action weights.

## RAG Sync

```mermaid
flowchart LR
  Content[content-service ITEM_UPSERT] --> Fanout[content.sync]
  Fanout --> RAGConsumer[RAGContentConsumer]
  RAGConsumer --> Catalog[Mongo catalog read]
  Catalog --> Chunker[chunker]
  Chunker --> Embedder[sentence-transformers]
  Embedder --> Qdrant[(Qdrant)]
  Webapp --> Ask[/v1/rag/ask]
  Ask --> Retriever[Retriever]
  Retriever --> Generator[Gemini generator]
```

Notes:

- Heavy indexing duoc chay background.
- `/v1/rag/index` trigger full index.
- Startup co warmup/auto-index neu vector store rong.

## Notification Flow

- Billing purchase/subscription va recommendation model training co the publish notification events.
- `notification-service` luu notification/preference va expose `/v1/notifications`.
- Webapp hien notifications va settings panel.

## Event Consistency Risks

- DLQ/replay process chua duoc document hoa trong repo.
- Python consumers tu khai bao queues/exchanges; can dam bao naming khop Nest contracts.
- Outbox relay health/retry can monitoring rieng.
- At-least-once delivery yeu cau idempotency moi consumer; content co `ProcessedMessages`, cac service khac can audit tiep.

