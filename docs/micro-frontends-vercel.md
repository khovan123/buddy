# Buddy Micro-Frontend Setup

Buddy uses a single Vercel project as the production shell while feature slices are kept behind package-level
boundaries in `webapp/src/features`.

## Vercel Project

- Vercel scope: `openbravo-wms`
- Vercel project: `buddy`
- Root directory: `webapp`
- Framework preset: Next.js
- Node.js: 22.x
- Runtime mode: `single-project`

## Source Contract

- Route ownership lives in `webapp/src/config/micro-frontends.ts`.
- Package candidates must expose a public `index.ts` entrypoint.
- App Router files must import package candidates from the feature root, for example `@/features/rag`.
- Cross-feature shared code should move through `webapp/src/shared` before any remote extraction.

## Checks

Run the local boundary check before pushing:

```bash
npm run mfe:check --workspace=webapp
```

The deployed shell also exposes the registry at:

```text
/api/micro-frontends
```
