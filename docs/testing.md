# Buddy - Testing

## Test Commands

Root `package.json`:

```bash
npm run test
npm run test:unit
npm run test:integration
npm run test:e2e
npm run lint
npm run mfe:check
```

CI currently runs:

- `npm run lint`
- `npx tsc --noEmit -p tsconfig.base.json`
- `npx turbo run test:unit --filter='!webapp' -- --passWithNoTests`
- webapp `npm run lint`, `npm run mfe:check`, `npx tsc --noEmit`, `npm test`

CI does not run root `test:integration` or `test:e2e`.

## Existing Test Coverage Map

| Area | Status | Evidence |
| --- | --- | --- |
| api-gateway | Partial | unit tests for proxy/cloud-run health; sample e2e |
| auth-service | Partial | subscription changed unit, sample e2e |
| user-service | Partial | RPC consumer unit; sample e2e |
| content-service | Good partial | moderation, policies, consumers, purchase, preview, integration workflow, sample e2e |
| upload-service | Good partial | preview/content extraction/document preview/get preview URL; sample e2e |
| billing-service | Partial | wallet repo, subscription plan RPC, SePay adapter, billing e2e |
| content-access-service | Partial | purchase-access e2e |
| notification-service | Partial | purchase notification unit, sample integration/e2e |
| interaction-service | Low | sample unit/integration/e2e only observed |
| recommendation-service | Unknown/Low | Python package exists; no pytest CI observed |
| rag-service | Unknown/Low | Python package exists; no pytest CI observed |
| webapp | Partial | microfrontend boundary test; lint/type check |

## API Coverage Gaps

- Gateway route parity voi downstream controllers chua duoc automated test.
- Update routes for content downstream co nhung gateway khong expose day du theo route scan.
- Upload status route mismatch can contract test.
- RAG/recommendation gateway composition can end-to-end tests voi fake downstream.
- Webhook raw body validation can integration tests.

## Recommended Test Layers

1. Contract route parity tests:
   - Compare gateway proxies voi downstream route inventory.
   - Fail CI khi downstream public route khong expose/khac method/path.
2. Event contract tests:
   - Validate `libs/contracts` payloads/routing keys voi producers/consumers.
   - Test idempotency on repeated delivery.
3. Critical e2e:
   - Register/login/refresh/logout.
   - Creator create resource -> upload confirm -> content processed -> visible in explore.
   - Purchase -> billing transaction -> content-access grant -> library.
   - RAG index -> ask -> sources returned.
   - Recommendation content sync -> for-you/trending.
4. Python service tests:
   - FastAPI route tests with fake Mongo/Redis/Qdrant.
   - Consumer payload handling.
   - Timeout/degraded readiness behavior.
5. Deployment smoke tests:
   - Cloud Run health/readiness.
   - Gateway auth and one route per downstream.
   - RabbitMQ consumer startup and DLQ visibility.

## CI/CD Testing Risks

- Unit-only backend gate can miss integration breakage.
- `--passWithNoTests` can hide packages without tests.
- MongoDB is not a CI service container in observed workflow, limiting Mongo integration tests.
- Python dependencies/tests are not first-class in root CI.
- E2E sample tests may give false confidence.

## Suggested Release Gate

Before production release:

- Run `npm run lint`
- Run `npx tsc --noEmit -p tsconfig.base.json`
- Run `npm run test:unit`
- Run `npm run test:integration`
- Run `npm run test:e2e`
- Add pytest jobs for `services/recommendation-service` and `services/rag-service`
- Run smoke suite against staging Cloud Run URLs

