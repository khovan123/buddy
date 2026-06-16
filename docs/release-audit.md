# Buddy - Release Audit

## Summary

Buddy co kien truc production-style va nhieu capability da implemented, nhung production readiness chua hoan tat. Rui ro lon nhat nam o CI/CD gates, deployment scalability, route/API parity, event replay/observability va README/deployment drift.

## Critical

| Finding | Impact | Evidence | Recommended action |
| --- | --- | --- | --- |
| CI khong chay integration/e2e truoc deploy | Regression cross-service co the len production | `.github/workflows/ci.yml` chi run unit tests backend va webapp tests | Them integration/e2e required checks cho critical flows |
| Cloud Run `max-instances 1` cho moi service | Khong HA, bottleneck, downtime khi instance fail | active deploy flags trong CI | Tang max instances, config concurrency, autoscaling va load test |
| Production migration flow chua ro | Schema drift co the lam deploy fail runtime | CI deploy khong thay migrate deploy active; compose prod chi migrate auth/upload | Chuan hoa migration job per Prisma service |

## High

| Finding | Impact | Evidence | Recommended action |
| --- | --- | --- | --- |
| README deployment/payment stale | Future agents/operator lam sai target/provider | README noi Fly/Azure/PayPal/PayOS; code/CI la Cloud Run/SePay | Update README hoac link docs nay |
| `docker-compose.prod.yml` incomplete/misconfigured | Local prod rehearsal khong dang tin | thieu services, content DB tro notification_db | Sua hoac rename deprecated |
| Gateway route parity gap | UI/API co the goi route khong ton tai hoac sai method | route scan: downstream PUT update/status khac gateway | Tao contract test va expose/align routes |
| Python services khong co CI test | RAG/recommendation regression kho phat hien | no pytest job observed | Them pytest, lint/type cho Python |
| DLQ/replay runbook missing | Event consistency kho recover | DLX exists, docs/runbook missing | Viet replay tooling/runbook, alert DLQ |
| Model artifacts persistence unknown | Recommendation training co the mat sau restart/deploy | model/FAISS local artifacts in service | Externalize artifacts to durable storage |

## Medium

| Finding | Impact | Evidence | Recommended action |
| --- | --- | --- | --- |
| Observability partial | Kho debug production incidents | OpenTelemetry/compose exists; dashboards/alerts unknown | Add dashboards, alerts, trace sampling docs |
| Logging inconsistent | Correlation/debug inconsistent | AppLogger/Nest/Python/console mixed | Standardize structured logs and correlation ids |
| Interaction TTL 90 days | Recommendation long-term signal co the mat | Mongoose TTL in interaction schema | Validate retention with ML needs |
| Webapp deployment not in repo CI | Release ownership unclear | CI comment says Vercel handles webapp | Document Vercel setup or add deploy step |
| FastAPI ops endpoints need auth model | Model train/index endpoints nguy hiem neu public | FastAPI routes no local auth observed | Keep private IAM, add gateway/admin guards |
| Local credentials weak | Dev OK, production dangerous if reused | compose default passwords | Mark dev-only and use secrets in prod |

## Low

| Finding | Impact | Evidence | Recommended action |
| --- | --- | --- | --- |
| Dynamic sitemap TODO | SEO incomplete | `webapp/src/app/sitemap.ts` TODO | Fetch dynamic slugs |
| Sample e2e tests | Coverage overestimated | many `sample.e2e-spec.ts` | Replace samples with real flows |
| Docs fragmented/stale | Future agent overhead | existing docs mismatch | Keep generated docs current with code changes |

## Production Readiness Checklist

| Category | Status |
| --- | --- |
| API coverage | Partial |
| Error handling | Partial/Good in gateway, unknown consistency across services |
| Security | Partial; gateway/internal Cloud Run strong, ops endpoints need audit |
| Monitoring | Partial |
| Logging | Partial |
| Unit testing | Partial |
| Integration testing | Partial, not CI-gated |
| E2E testing | Low, not CI-gated |
| CI/CD | Partial |
| Deployment | Partial |
| Data consistency | Partial with outbox/idempotency, replay docs missing |
| Event consistency | Partial |

## Recommended Release Blockers

Before treating as production-ready:

1. Add CI gate for purchase/library and upload/content e2e.
2. Fix Cloud Run scaling and health/readiness per service.
3. Fix gateway route parity and add automated contract test.
4. Define migration/deploy order.
5. Add DLQ monitoring/replay runbook.
6. Validate payment webhook security and idempotency in staging.

