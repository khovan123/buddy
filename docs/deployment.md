# Deployment Guide

## Architecture Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   GitHub     │────▶│  Vercel          │     │  Azure Container    │
│   Repository │     │  (webapp)        │     │  Apps (services)    │
│              │     └──────────────────┘     └─────────────────────┘
│              │                                       ▲
│              │────▶ GitHub Actions ──▶ ACR ───────────┘
└─────────────┘
```

## Webapp (Next.js) → Vercel

**Method:** Vercel Git Integration (auto-deploy)

| Setting | Value |
|---------|-------|
| Platform | Vercel |
| Root Directory | `webapp` |
| Framework | Next.js (auto-detected) |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Production Branch | `main` |

### Setup

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import the GitHub repository
3. Set **Root Directory** = `webapp`
4. Add environment variables in Vercel dashboard
5. Deploy

### Behavior

- **Push to `main`** → Production deployment
- **Pull Request** → Preview deployment (unique URL per PR)

---

## Backend Services (NestJS) → Azure Container Apps

**Method:** GitHub Actions → Azure Container Registry → Azure Container Apps

### Pipeline Flow

```
Push to main ──▶ Test ──▶ Build Docker ──▶ Push to ACR ──▶ Deploy to Azure
                  │           │                                  │
                  │     (only changed                    az containerapp
                  │      services)                         update
                  │
            Lint + TypeCheck
            + Unit Tests
```

### Services

| Service | Port | Azure App Name |
|---------|------|----------------|
| api-gateway | 3000 | buddy-api-gateway |
| auth-service | 3001 | buddy-auth-service |
| user-service | 3002 | buddy-user-service |
| notification-service | 3003 | buddy-notification-service |
| content-service | 3004 | buddy-content-service |
| upload-service | 3005 | buddy-upload-service |
| billing-service | 3006 | buddy-billing-service |
| content-access-service | 3007 | buddy-content-access-service |
| interaction-service | 3008 | buddy-interaction-service |
| recommendation-service | 3009 | buddy-recommendation-service |

### GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | Azure Service Principal client ID |
| `AZURE_CLIENT_SECRET` | Azure Service Principal secret |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `AZURE_REGISTRY_URL` | ACR URL (e.g., `buddyregistry.azurecr.io`) |

### Trigger Rules

- **Test**: Runs on push to `main` and PRs — only when `services/`, `libs/`, or `package*.json` change
- **Build + Deploy**: Runs on push to `main` only — per-service path filtering (only changed services are rebuilt)

---

## Local Development

Infrastructure services run via Docker Compose:

```bash
docker-compose up -d postgres redis rabbitmq mongodb
```

Backend services run directly:

```bash
npm run dev --workspace=services/api-gateway
```

Webapp:

```bash
cd webapp && npm run dev
```
