# Webapp Micro-Frontend Design

## Goal

Design the Buddy `webapp` as a micro-frontend-ready Next.js application without disrupting the current App Router deployment. The first implementation step is a typed registry that describes ownership, route boundaries, shared contracts, and rollout order. Runtime remotes should be introduced only after the shell contracts are stable.

## Current Shell

The current `webapp` is a single Next.js 16 application with:

- Root providers in `webapp/src/app/layout.tsx`.
- Public pages under `webapp/src/app/(intro)` and `webapp/src/app/(public)`.
- Authenticated pages under `webapp/src/app/(private)`.
- Feature code under `webapp/src/features/*`.
- Shared UI and design tokens under `webapp/src/components/*` and `webapp/src/app/globals.css`.

This is already close to a micro-frontend layout because routes are grouped by product surface and feature folders contain most local behavior. The missing piece is an explicit contract that prevents feature slices from sharing state, API calls, and navigation implicitly.

## Architecture

```txt
Next.js host shell
  app/layout.tsx
    owns global providers, metadata, theme, toast, upload progress

  app/(intro)
    mounts Public Intro Experience

  app/(public)/(auth)
    mounts Authentication

  app/(private)
    owns private header, auth bootstrap, private page frame

  app/(private)/dashboard
    owns dashboard sidebar and breadcrumb shell
    mounts Creator And Admin Dashboard routes

  feature slices
    src/features/intro
    src/features/auth
    src/features/content
    src/features/dashboard
    src/features/billing
    src/features/chat
```

The host shell owns cross-cutting concerns. Micro-frontends own route content and local workflows.

## Registry

The canonical registry lives in:

```txt
webapp/src/config/micro-frontends.ts
```

Each entry declares:

- `id` and `name` for stable identification.
- `status` as `live`, `candidate`, or `planned`.
- `mountMode` as `route-segment`, `package`, or `remote`.
- `sourceRoot` for the owning feature folder.
- `routes` for App Router ownership.
- `contract` for auth, data access, state scope, and required providers.
- `sharedCapabilities` for reusable shell or UI affordances.
- `rolloutNotes` for migration constraints.

The registry also exposes `getMicroFrontendById()` and `getMicroFrontendByPath()` so navigation, telemetry, error boundaries, and future route analytics can resolve the owning slice without hard-coded path checks.

## Boundaries

| Slice | Current mount | Future mount | Boundary |
| --- | --- | --- | --- |
| Public Intro Experience | App route segment | Route segment | Public marketing and SEO only |
| Authentication | App route segment | Route segment or package | Login, sign-up, OTP, session exchange |
| Learning Workspace | App route segment | Package | Home, explore, library, content discovery |
| Creator And Admin Dashboard | App route segment | Package | Dashboard metadata and creator content tools |
| Wallet And Billing | App route segment | Package | Wallet, payouts, subscriptions, billing settings |
| AI Study Assistant | App route segment | Remote | RAG chat, streaming transport, citations |

## Shell Contract

The host shell owns:

- `ReduxProvider`, `AppInitializer`, `ThemeProvider`, `TooltipProvider`, and `ErrorProvider`.
- `PrivateHeader`, private page frame, dashboard sidebar, and breadcrumbs.
- Global metadata, JSON-LD, design tokens, toast surface, and upload progress panel.
- Auth/session bootstrap and redirects that apply across private pages.

Micro-frontends must not instantiate their own global providers. They receive the shell context that already exists and keep feature-specific state inside the slice.

## Data Contract

All runtime data should flow through one of these paths:

- `static-content` for public SEO and marketing copy.
- `api-gateway` for service-backed requests through typed feature services.
- `server-actions` for form flows that need server-only cookies or revalidation.

Feature components should not call downstream service URLs directly. Calls should remain behind `webapp/src/features/*/services` or `webapp/src/features/*/actions`.

## State Contract

Use the smallest viable state scope:

- `local` for isolated UI state, filters, drafts, and chat stream buffers.
- `feature-store` for feature-specific Redux/Zustand state.
- `shared-shell` only for app-wide session, theme, toast, and upload progress.

Remote candidates must not depend on arbitrary root store shape. They should accept typed inputs and emit typed events.

## UI Contract

Micro-frontends share:

- Tailwind v4 tokens from `globals.css`.
- `components/ui` primitives.
- Reusable cards, readers, navigation pieces, and document viewers from `components/*`.
- Lucide icons already available in the webapp package.

Feature slices should not redefine the color palette or create competing global CSS. New route-level visual language should be contained in components and composed from existing tokens.

## Rollout Plan

1. Keep all slices mounted as App Router route segments while the registry becomes the source of truth.
2. Move feature-level imports to use the registry for route ownership checks, telemetry labels, and breadcrumbs where useful.
3. Extract shared UI primitives and service contracts before any independent deployment work.
4. Convert `Learning Workspace`, `Creator And Admin Dashboard`, and `Wallet And Billing` to package-style slices if ownership needs to split across teams.
5. Treat `AI Study Assistant` as the first true remote candidate because it is a focused, high-change surface with streaming behavior that can be isolated behind a shell route.
6. Introduce runtime remote loading only after package boundaries are clean and each candidate has a documented fallback state.

## Runtime Remote Rules

When a slice moves to `mountMode: "remote"`:

- The host route remains in the Next.js app and controls auth, metadata, loading, and error boundaries.
- The remote exports one typed entry component and no global providers.
- The remote receives only typed props and feature-specific client configuration.
- The remote returns explicit loading, empty, and error states.
- The host has a static fallback component for remote-load failure.
- Shared package versions are pinned and verified during CI before deploy.

## Verification Gates

Before promoting a slice from `candidate` to `remote`:

- `npm run typecheck` passes in `webapp`.
- `npm run lint` passes for the touched slice.
- The route renders under both desktop and mobile viewport widths.
- Auth-required routes redirect correctly when unauthenticated.
- Remote-load failure shows a usable fallback rather than a blank route.
- No slice imports from another slice except through shared contracts or UI primitives.

## Open Decisions

- Whether runtime federation should use a Next-compatible federation plugin, import maps, or an edge/BFF composition layer.
- Whether each remote deploys independently or remains a workspace package with separate ownership only.
- Whether telemetry should record micro-frontend ownership at route change time or at server request time.
- Which shared contracts should move into a dedicated workspace package if runtime remotes are adopted.
