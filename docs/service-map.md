# Buddy - Service Map

## Monorepo Layout

| Path | Vai tro |
| --- | --- |
| `webapp/` | Next.js frontend, App Router, feature-based UI/services |
| `services/api-gateway/` | Public ingress, REST/WebSocket proxy, resilience |
| `services/auth-service/` | Identity, JWT, refresh tokens, OTP/OAuth |
| `services/user-service/` | Profiles, follows, ratings, profile metadata |
| `services/content-service/` | Resources, tutorials, collections, majors/courses, library |
| `services/upload-service/` | Upload confirmation, media files, preview/HLS/outbox |
| `services/billing-service/` | Wallet, transactions, purchase, subscription, payout, SePay |
| `services/content-access-service/` | Purchase access/ownership grants |
| `services/notification-service/` | Notifications and preferences |
| `services/interaction-service/` | Engagement tracking and forum |
| `services/recommendation-service/` | Recommendation/trending/model training |
| `services/rag-service/` | RAG Q&A, retrieval, vector indexing |
| `libs/common/` | Shared logger, filters, guards, observability, resilience, config |
| `libs/contracts/` | Event/RPC contracts and routing keys |
| `libs/testing/` | Shared test setup/mocks |

## Public API Surface Via Gateway

| Gateway area | Downstream | Major routes |
| --- | --- | --- |
| `/v1/auth` | auth-service | register, login, oauth/google, verify/resend OTP, refresh, logout, me, password |
| `/v1/users` | user-service | list, me, update me, profile by id, creator stats; follow/rating partly downstream |
| `/v1/profile-metadata` | user-service | careers, skills |
| `/v1/resources` | content-service | create/list/me/user/top/by-ids/uncollected/delete/slug/preview/collections |
| `/v1/tutorials` | content-service | create/list/me/top/by-ids/uncollected/delete/slug/upload-history/collections |
| `/v1/collections` | content-service | create/list resource/tutorial/me/top/by-ids/get by slug |
| `/v1/content-meta` | content-service | meta, courses, majors/courses CRUD |
| `/v1/uploads` | upload-service | url/history/tutorial confirm/resource confirm/videos routes |
| `/v1/billing` | billing-service | wallet, purchase, banks, payout, subscription, sales count |
| `/v1/webhooks/billing` | billing-service | SePay deposit/withdraw |
| `/v1/libraries` | content-service/content-access | purchased ids, resources, tutorials, collections |
| `/v1/notifications` | notification-service | list/read-all/preferences |
| `/v1/interactions` | interaction-service | post interaction, stats |
| `/v1/forum` | interaction-service | topics/messages/reactions/events/ws |
| `/v1/recommendations` | recommendation-service + content composition | for-you, trending, model ops |
| `/v1/recommendations/rag` | rag-service | ask/retrieve/history/index/stats/health |

## Internal RPC/Event Boundaries

- `content-service` owns content catalog and answers purchase catalog RPC.
- `upload-service` owns file lifecycle and emits upload processing events.
- `billing-service` owns money movement and emits purchase/subscription events.
- `content-access-service` owns access grant and compensation events.
- `recommendation-service` and `rag-service` consume read-model sync; they must not be canonical content owners.
- `api-gateway` should not implement business rules beyond auth/proxy/composition/resilience.

## Frontend Feature Map

| Feature folder | Backend dependency |
| --- | --- |
| `features/auth` | `/v1/auth`, NextAuth |
| `features/content` | `/v1/resources`, `/v1/tutorials`, `/v1/collections`, `/v1/content-meta`, `/v1/uploads`, recommendations |
| `features/billing` | `/v1/billing` |
| `features/dashboard` | content + billing plan limits |
| `features/forum` | `/v1/forum`, WebSocket |
| `features/interaction` | `/v1/interactions` |
| `features/library` | `/v1/libraries` |
| `features/rag` | `/v1/recommendations/rag` |
| `features/settings` | notifications, profile/security |
| `features/user` | users, notifications, wallet header |

