# Buddy - AI Handoff

## How To Work On This Repo

Buddy is a brownfield, near-production monorepo. Future AI agents should first inspect code, then update docs/tests. README is useful for intent, but not authoritative when it conflicts with code.

Primary rules:

- Trust source code, schemas, routes and CI over README.
- Keep service ownership boundaries intact.
- Do not query/write another service database from a service unless existing code already does it as a read model.
- Update `libs/contracts` carefully; event routing changes can break multiple consumers.
- For public API changes, update gateway proxy, downstream controller, frontend service, tests and docs together.
- For docs, write Vietnamese but preserve English technical terms.

## Quick Start Context

Buddy has:

- `webapp`: Next.js 16 marketplace UI.
- `api-gateway`: public NestJS/Fastify ingress.
- 8 additional NestJS backend services.
- 2 FastAPI AI services: recommendation and RAG.
- PostgreSQL/Prisma + MongoDB/Mongoose + Redis + RabbitMQ + Qdrant.
- Google Cloud Run backend deployment in CI.

## Most Important Files

| Need | Files |
| --- | --- |
| Product/API overview | `README.md`, `docs/prd.md`, gateway controllers |
| Service boundaries | `docs/service-map.md`, `services/*/src/app.module.ts` |
| Data models | `docs/database-map.md`, Prisma schemas, Mongoose schemas |
| Events | `docs/event-flows.md`, `libs/contracts/src/events`, service consumers/publishers |
| Deployment | `.github/workflows/ci.yml`, `docker-compose.yml`, service Dockerfiles |
| Testing | `docs/testing.md`, `jest.config.js`, `test/`, `__tests__/` |
| Risks | `docs/release-audit.md` |

## Common Change Patterns

### Add Or Change API Endpoint

1. Change downstream service controller/DTO/use case.
2. Change `api-gateway` proxy route.
3. Update frontend service under `webapp/src/features/*/services`.
4. Add/adjust unit and route parity tests.
5. Update `docs/service-map.md` and `docs/prd.md`.

### Add Or Change Event

1. Update `libs/contracts/src/events`.
2. Update producer publisher.
3. Update all consumers and idempotency behavior.
4. Add test for duplicate delivery and malformed payload.
5. Update `docs/event-flows.md`.

### Change Database Schema

1. Update owning service schema only.
2. Add migration for Prisma services.
3. Update repository/query code.
4. Audit event payload/read model impacts.
5. Update `docs/database-map.md`.

### Change Deployment

1. Update `.github/workflows/ci.yml` or infra config.
2. Verify migration order.
3. Verify secrets/environment variables.
4. Update `docs/deployment.md`.
5. Add release audit note if risk remains.

## Known Hotspots

- Gateway proxy route parity.
- Billing purchase saga/outbox/compensation.
- Upload media processing and content update consumers.
- RAG indexing and embedding cold start.
- Recommendation model artifact persistence and training route safety.
- CI gaps around integration/e2e/Python.
- Stale deployment/provider claims in README.

## Unfinished Features / Open Questions

- Is webapp deploy fully managed in Vercel outside repo?
- What is official production payment provider: SePay only, or also PayOS/PayPal later?
- Should RAG answer only from purchased content or public catalog?
- What are marketplace fees and refund rules?
- Who can call model training/rebuild-index endpoints?
- What is the desired Cloud Run scaling policy?
- Where should recommendation model artifacts be stored durably?

## Current Documentation Set

- `docs/project-context.md`: product/context overview.
- `docs/architecture.md`: diagrams, interactions, security, deployment topology.
- `docs/prd.md`: reverse-engineered PRD and feature status.
- `docs/service-map.md`: service/API/frontend map.
- `docs/database-map.md`: database ownership/schema summary.
- `docs/event-flows.md`: event and saga map.
- `docs/deployment.md`: local/CI/Cloud Run deployment.
- `docs/testing.md`: test coverage and recommended gates.
- `docs/release-audit.md`: production readiness audit.
- `docs/ai-handoff.md`: this future-agent guide.

