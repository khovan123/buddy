<div align="right">
  <a href="README.md"><img alt="English" src="https://img.shields.io/badge/Language-English-blue?style=for-the-badge&logo=google-translate"></a>
  <a href="README-vi.md"><img alt="Tiếng Việt" src="https://img.shields.io/badge/Ngôn_ngữ-Tiếng_Việt-red?style=for-the-badge&logo=google-translate"></a>
</div>

<div align="center">
  <h1>🎓 Buddy</h1>
  <p><strong>A distributed learning platform with AI-powered recommendations, HLS video streaming, and a RAG-based study assistant — built on production-grade microservices.</strong></p>

  <p>
    <img alt="Version" src="https://img.shields.io/badge/version-v1.0.0-blue.svg" />
    <img alt="NestJS" src="https://img.shields.io/badge/nestjs-%23E0234E.svg?style=flat&logo=nestjs&logoColor=white" />
    <img alt="Next.js" src="https://img.shields.io/badge/next.js-000000?style=flat&logo=nextdotjs&logoColor=white" />
    <img alt="TypeScript" src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white" />
    <img alt="Python" src="https://img.shields.io/badge/python-3670A0?style=flat&logo=python&logoColor=ffdd54" />
    <img alt="TensorFlow" src="https://img.shields.io/badge/tensorflow-%23FF6F00.svg?style=flat&logo=tensorflow&logoColor=white" />
    <img alt="Docker" src="https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white" />
    <img alt="Azure" src="https://img.shields.io/badge/azure-%230072C6.svg?style=flat&logo=microsoftazure&logoColor=white" />
  </p>

  <p>
    <a href="#-introduction">Introduction</a> •
    <a href="#-core-features">Features</a> •
    <a href="#-system-architecture">Architecture</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-deployment">Deployment</a>
  </p>
</div>

---

## 🌟 Introduction

**Buddy** is a full-stack, distributed learning platform designed for university students and content creators. Think of it as a self-hosted Udemy with **AI superpowers** — creators publish tutorials and resources, students enroll in courses, and an AI assistant helps learners study by answering questions grounded in the actual course materials.

The platform is built as a **monorepo** containing 10 independently deployable microservices (NestJS + FastAPI), a modern Next.js 16 webapp, and shared libraries — all orchestrated via Turborepo, RabbitMQ, and Docker Compose.

### Why Buddy?

| Problem | Buddy's Solution |
| :--- | :--- |
| Students drown in scattered PDFs and videos | **Unified Library** — all resources organized by course, collection, and major |
| Video content requires expensive CDN | **HLS Streaming** — FFmpeg transcodes to `.m3u8`, served via Supabase S3 presigned URLs |
| "What was covered in lecture 5?" | **RAG AI Assistant** — asks questions against your enrolled course materials with cited sources |
| "What should I learn next?" | **Two-Tower ML Model** — personalized recommendations based on profile, behavior, and popularity |
| Payment complexity for content creators | **Wallet System** — PayPal + PayOS integration with transaction history and payouts |

---

## ✨ Core Features

### 1. 📚 Content Management & Streaming

Creators publish rich learning content with automated media processing.

* **Tutorials:** Video-based lessons with HLS adaptive streaming. FFmpeg transcodes raw uploads into `.m3u8` segments in background BullMQ workers.
* **Resources:** Uploadable documents (PDF, DOCX, PPTX) with in-browser preview. Files are stored in Supabase S3 with time-limited presigned URLs for secure access.
* **Collections:** Curated playlists of tutorials and resources, organized by learning phases.
* **Courses & Majors:** Hierarchical organization — Majors → Courses → Tutorials/Resources.
* **Trailer Generation:** Automatically extracts the first 15 seconds of tutorial video as a Cloudinary-hosted trailer.

### 2. 🤖 AI Study Assistant (RAG)

Ask questions about your course materials and get grounded, cited answers.

* **Pipeline:** `Retrieve → Generate → Cache` — Qdrant vector search finds relevant chunks, Gemini generates the answer, Redis caches responses.
* **Semantic Search:** Content is chunked, embedded via `sentence-transformers`, and indexed in Qdrant for vector similarity search.
* **Source Citations:** Every AI response includes clickable source references linking back to the original tutorial or resource.
* **Streaming UI:** Real-time response streaming in a chat interface with markdown rendering.

### 3. 🎯 Smart Recommendations

A Python-based ML engine that learns what each student needs.

* **Two-Tower Model:** TensorFlow/Keras neural network with separate User Tower (user_id, major, semester, career) and Item Tower (item_id, type, major, course) — computes cosine similarity for personalized ranking.
* **Multi-Signal Scoring:** Combines profile-based matching, behavioral signals (views, enrollments), and popularity scores.
* **Drift Monitoring:** Tracks out-of-vocabulary rates and automatically triggers model retraining when drift exceeds thresholds.
* **FAISS Indexing:** Approximate nearest neighbor search for sub-millisecond inference at scale, rebuilt periodically.

### 4. 💳 Billing & Monetization

Full payment lifecycle for content creators and students.

* **Wallet System:** Each user has a wallet with deposit/withdrawal capabilities and full transaction history.
* **Payment Gateways:** Dual integration with **PayPal** (international) and **PayOS** (Vietnam domestic).
* **Resource Ownership:** Purchase tracking via `UserResourceOwnership` — buy once, access forever.
* **Subscription Model:** Configurable subscription plans with automated billing cycles.
* **Payout Accounts:** Creators link bank accounts for revenue withdrawal.

### 5. 👥 Social & Interaction

Community features that drive engagement.

* **Follow System:** Follow creators to get notified about new content.
* **Ratings & Reviews:** Rate tutorials and resources with aggregated scoring.
* **Real-time Notifications:** Socket.io-powered notifications for enrollments, purchases, and social events.
* **User Profiles:** Rich profiles with career information, highlight skills, and profile metadata.

### 6. 🔍 Explore & Discovery

Multiple pathways to find the right content.

* **Explore Page:** Browse trending tutorials, popular resources, and curated collections.
* **Career Skills:** Filter content by career path and required skills.
* **SEO Optimization:** Server-rendered pages with metadata for organic discovery.
* **Content Library:** Personal library of saved and purchased content.

---

## 🏗️ System Architecture

```
                            ┌──────────────────────┐
                            │      Webapp           │
                            │  Next.js 16 (Vercel)  │
                            └──────────┬───────────┘
                                       │
                            ┌──────────▼───────────┐
                            │    API Gateway        │
                            │  Reverse Proxy +      │
                            │  Resilience Stack     │
                            │  (:3000)              │
                            └──────────┬───────────┘
                                       │
          ┌──────────┬────────┬────────┼────────┬──────────┬──────────┐
          │          │        │        │        │          │          │
    ┌─────▼──┐ ┌────▼───┐ ┌──▼──┐ ┌───▼──┐ ┌───▼──┐ ┌────▼───┐ ┌───▼──────┐
    │  Auth  │ │ User   │ │Cont-│ │Upload│ │Bill- │ │Notif-  │ │Content   │
    │Service │ │Service │ │ent  │ │Serv. │ │ing   │ │ication │ │Access    │
    │ :3001  │ │ :3002  │ │:3004│ │:3005 │ │:3006 │ │ :3003  │ │ :3007    │
    └────────┘ └────────┘ └─────┘ └──────┘ └──────┘ └────────┘ └──────────┘
          │          │        │        │        │          │          │
    ┌─────┴──────────┴────────┴────────┴────────┴──────────┴──────────┘
    │                         RabbitMQ (Event Bus)
    └──────────────────────────────────────────────────────────────────┘
          │          │                    │
    ┌─────▼──┐ ┌────▼───┐         ┌──────▼──────┐      ┌──────────┐
    │Postgres│ │MongoDB │         │Interact.    │      │  Recom.  │
    │  (SQL) │ │(NoSQL) │         │Service :3008│      │  Service │
    └────────┘ └────────┘         └─────────────┘      │  :3009   │
                                                       │ (Python) │
                                                       └─────┬────┘
                                                             │
                                                       ┌─────▼────┐
                                                       │  Qdrant  │
                                                       │ (Vector) │
                                                       └──────────┘
```

### API Gateway — Resilience Stack

The gateway implements three layers of protection for every downstream call:

```
Request  →  Bulkhead (isolate concurrency)  →  Circuit Breaker (fail-fast)  →  Retry (idempotent only)  →  Downstream
```

| Pattern | Purpose |
| :--- | :--- |
| **Bulkhead** | Per-service concurrency limits (20 default, 10 for upload) — prevents one slow service from exhausting all connections |
| **Circuit Breaker** | 3-state (Closed → Open → Half-Open) — stops cascading failures after 5 consecutive errors |
| **Retry** | Exponential backoff (500ms → 1s) — **only for GET** requests to prevent duplicate writes |
| **API Composition** | `Promise.allSettled()` for parallel multi-service aggregation with partial failure tolerance |

### Clean Architecture (per service)

```
services/<name>/src/
├── presentation/       # HTTP controllers, DTOs, Event handlers
├── application/        # CQRS — Commands & Queries handlers
├── domain/             # Pure TypeScript entities, value objects, repository interfaces
├── infrastructure/     # Database, messaging, external adapters
└── shared/             # Internal DTOs, mappers
```

> **Rule:** Domain layer has zero NestJS dependencies. All framework coupling is in Infrastructure.

### Hybrid Database Strategy

| Database | Use Case | Services |
| :--- | :--- | :--- |
| **PostgreSQL** | Transactional data (ACID) | Auth, Billing, Upload, Content-Access |
| **MongoDB** | Flexible schemas, rich queries | Content, User, Interaction, Notification |
| **Qdrant** | Vector similarity search | Recommendation (RAG) |
| **Redis** | Caching, BullMQ job queues | All services |

---

## 🛠️ Tech Stack

### Backend (Microservices)

| Layer | Technology |
| :--- | :--- |
| **Framework** | NestJS 11 (Fastify adapter) |
| **Language** | TypeScript 5.4 |
| **ORM** | Prisma 7 (PostgreSQL), Mongoose (MongoDB) |
| **Messaging** | RabbitMQ (event-driven, Saga choreography) |
| **Caching** | Redis 7 + BullMQ (job queues) |
| **Auth** | JWT (access + refresh tokens) |
| **Storage** | Supabase S3 (videos, resources), Cloudinary (thumbnails, trailers) |
| **Video** | FFmpeg → HLS transcoding in BullMQ workers |
| **Observability** | OpenTelemetry → Jaeger (tracing) + Prometheus → Grafana (metrics) |
| **Build** | Turborepo + SWC (fast TypeScript compilation) |

### AI & ML Engine

| Component | Technology |
| :--- | :--- |
| **Framework** | FastAPI + Uvicorn |
| **ML Model** | TensorFlow/Keras (Two-Tower architecture) |
| **Embeddings** | Sentence-Transformers (`all-MiniLM-L6-v2`) |
| **Vector DB** | Qdrant + FAISS (approximate nearest neighbor) |
| **LLM** | Google Gemini (generative AI for RAG) |
| **Scoring** | Multi-signal engine (profile + behavioral + popularity) |

### Frontend (Webapp)

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **UI** | React 19, Radix UI, shadcn/ui |
| **Styling** | Tailwind CSS v4, Framer Motion |
| **State** | Redux Toolkit + Zustand + Redux Persist |
| **Forms** | React Hook Form + Zod validation |
| **3D** | Spline (landing page visuals) |
| **Real-time** | Socket.io client |
| **Auth** | NextAuth.js v4 |

### Infrastructure

| Component | Technology |
| :--- | :--- |
| **Containers** | Docker + Docker Compose |
| **CI/CD** | GitHub Actions (backend) + Vercel (webapp) |
| **Cloud** | Azure Container Apps + Azure Container Registry |
| **Monitoring** | Prometheus + Grafana + Jaeger |

---

## 🗂️ Monorepo Structure

```
buddy/
├── services/                       # Backend microservices
│   ├── api-gateway/                # Reverse proxy + resilience (:3000)
│   ├── auth-service/               # JWT auth, refresh tokens (:3001)
│   ├── user-service/               # Profiles, follows, ratings (:3002)
│   ├── notification-service/       # Real-time + email notifications (:3003)
│   ├── content-service/            # Tutorials, courses, resources (:3004)
│   ├── upload-service/             # S3 + Cloudinary + FFmpeg (:3005)
│   ├── billing-service/            # Wallets, PayPal, PayOS (:3006)
│   ├── content-access-service/     # Ownership & access control (:3007)
│   ├── interaction-service/        # Views, saves, engagement (:3008)
│   └── recommendation-service/     # Python ML + RAG engine (:3009)
│
├── webapp/                         # Next.js 16 frontend
│   └── src/
│       ├── app/                    # App Router pages
│       │   ├── (intro)/            # Landing, pricing, FAQ, about
│       │   ├── (private)/          # Dashboard, library, explore, ask (RAG), profile, settings
│       │   └── (public)/           # Auth pages
│       ├── features/               # Feature modules (auth, billing, content, rag, user, ...)
│       ├── components/             # UI components (atoms, molecules, organisms)
│       ├── bones/                  # Design system configuration (boneyard-js)
│       └── lib/                    # Redux store, socket, utilities
│
├── libs/                           # Shared libraries
│   ├── common/                     # Guards, config, resilience, observability, logger
│   ├── contracts/                  # Shared DTOs, events (single source of truth)
│   └── testing/                    # Jest global mocks
│
├── docker-compose.yml              # Local infrastructure
├── Dockerfile                      # Multi-stage build (shared across services)
├── turbo.json                      # Turborepo pipeline config
└── .github/workflows/ci.yml       # GitHub Actions CI/CD
```

---

## 🔗 Service Map

| Service | Port | Database | Responsibilities |
| :--- | :---: | :--- | :--- |
| **api-gateway** | 3000 | — | Reverse proxy, circuit breaker, bulkhead, retry, API composition |
| **auth-service** | 3001 | PostgreSQL | Registration, login, JWT tokens, refresh rotation |
| **user-service** | 3002 | MongoDB | User profiles, careers, skills, follows, ratings |
| **notification-service** | 3003 | MongoDB | Socket.io real-time push, email notifications |
| **content-service** | 3004 | MongoDB | Tutorials, courses, majors, resources, collections, saved content |
| **upload-service** | 3005 | PostgreSQL | Presigned URL generation, FFmpeg HLS transcoding, trailer extraction |
| **billing-service** | 3006 | PostgreSQL | Wallets, transactions, PayPal/PayOS webhooks, subscriptions, payouts |
| **content-access-service** | 3007 | PostgreSQL | Resource ownership verification, access grants |
| **interaction-service** | 3008 | MongoDB | View tracking, content saves, engagement metrics |
| **recommendation-service** | 3009 | MongoDB + Qdrant | Two-Tower ML model, RAG pipeline, trending, scoring engine |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20.0.0 (< 23.0.0)
- **npm** >= 10.0.0
- **Docker** & **Docker Compose**
- **Python** 3.10+ (for recommendation-service)

### 1. Clone & Install

```bash
git clone https://github.com/khovan123/buddy.git
cd buddy
npm install
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL, MongoDB, Redis, RabbitMQ, Qdrant, Prometheus, Grafana, Jaeger
docker-compose up -d
```

### 3. Generate Prisma Clients

```bash
npm run prisma:generate
```

### 4. Run Database Migrations

```bash
npm run prisma:db:push
```

### 5. Start All Services

```bash
# Start all services in development mode (Turborepo orchestrated)
npm run dev
```

Or start individual services:

```bash
# Single backend service
npm run dev --workspace=services/content-service

# Webapp
cd webapp && npm run dev
```

### 6. Access

| Service | URL |
| :--- | :--- |
| **Webapp** | http://localhost:8000 |
| **API Gateway** | http://localhost:3000 |
| **API Docs** | http://localhost:8000/api-docs |
| **Grafana** | http://localhost:3100 |
| **Prometheus** | http://localhost:9090 |
| **Jaeger** | http://localhost:16686 |
| **RabbitMQ Management** | http://localhost:15672 |
| **Qdrant Dashboard** | http://localhost:6333/dashboard |

---

## ☁️ Deployment

### Architecture Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   GitHub     │────▶│  Vercel          │     │  Azure Container    │
│   Repository │     │  (webapp)        │     │  Apps (services)    │
│              │     └──────────────────┘     └─────────────────────┘
│              │                                       ▲
│              │────▶ GitHub Actions ──▶ ACR ───────────┘
└─────────────┘
```

### Webapp → Vercel

Deployed automatically via Vercel Git Integration.

- **Root Directory:** `webapp`
- **Push to `production`** → Production deployment
- **Pull Request** → Preview deployment (unique URL)

### Backend → Azure Container Apps

Deployed via GitHub Actions with path-based filtering — only changed services are rebuilt.

```
Push to production → Lint & Test → Build Docker (changed only) → Push to ACR → Deploy to Azure
```

| Trigger | Condition |
| :--- | :--- |
| **Test** | Changes in `services/`, `libs/`, or `package*.json` |
| **Build + Deploy** | Push to `production` — per-service path filtering |

See [docs/deployment.md](docs/deployment.md) for full configuration details.

---

## 📊 Observability

The platform includes a full observability stack out of the box:

| Tool | Purpose | Port |
| :--- | :--- | :---: |
| **Jaeger** | Distributed tracing (OpenTelemetry) | 16686 |
| **Prometheus** | Metrics collection & alerting | 9090 |
| **Grafana** | Dashboards & visualization | 3100 |

Every service is auto-instrumented via `@opentelemetry/sdk-node` with:
- HTTP request tracing with correlation IDs
- Prisma query instrumentation
- Host metrics (CPU, memory, network)
- OTLP export to Jaeger and Prometheus

---

## ⚖️ Pros & Cons

### ✅ Pros

* **Production Architecture:** Clean Architecture + CQRS + Event-Driven — not a tutorial project.
* **Full Resilience Stack:** Bulkhead, Circuit Breaker, Retry with proper idempotency handling.
* **AI-Native:** RAG pipeline with vector search and Two-Tower ML model — not just API wrappers.
* **Observability Built-In:** Tracing, metrics, and dashboards from day one.
* **Monorepo DX:** Turborepo + shared libs + single Dockerfile = fast iteration across 10 services.

### ❌ Cons

* **Complex Local Setup:** Requires Docker, PostgreSQL, MongoDB, Redis, RabbitMQ, and Qdrant running simultaneously.
* **GPU Optional:** The recommendation service uses CPU inference by default. GPU acceleration requires manual TensorFlow configuration.
* **No Mobile App Yet:** The webapp is responsive but there is no native iOS/Android app.

---

## 📖 Documentation

| Document | Description |
| :--- | :--- |
| [SPEC.md](docs/SPEC.md) | Full technical specification & coding standards |
| [deployment.md](docs/deployment.md) | Deployment guide for Vercel & Azure |
| [api-gateway-architecture.MD](docs/api-gateway-architecture.MD) | API Gateway resilience patterns deep-dive |
| [upload-service-architecture.md](docs/upload-service-architecture.md) | Upload & video processing architecture |

---

## 📄 License

This project is private and not licensed for public distribution.

---

<div align="center">
  <sub>Built with 💜 by <a href="https://github.com/khovan123">khovan123</a> — Engineering learning, one microservice at a time.</sub>
</div>
