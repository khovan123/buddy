/**
 * Prisma Client factory for seeding production databases via Prisma Accelerate.
 *
 * Each service has its own Prisma schema + generated client + Accelerate URL.
 * This module creates one PrismaClient per service, reusing the same
 * withAccelerate() pattern from each service's prisma.service.ts.
 */
import { withAccelerate } from '@prisma/extension-accelerate';
import { readFileSync } from 'fs';
import path from 'path';

const SERVICES_DIR = path.resolve(__dirname, '../../services');

/** Read the active DATABASE_URL (Accelerate URL) from a service's .env.prod */
function readAccelerateUrl(serviceName: string): string {
  const envPath = path.resolve(SERVICES_DIR, serviceName, '.env.prod');
  const content = readFileSync(envPath, 'utf-8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    // Skip commented lines — we want the active Accelerate URL
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('DATABASE_URL=')) {
      return trimmed.replace('DATABASE_URL=', '');
    }
  }
  throw new Error(`[SEED] No DATABASE_URL found in ${envPath}`);
}

// ── Auth Service PrismaClient ───────────────────────────────────────────────
import { PrismaClient as AuthPrismaClient } from '../../services/auth-service/src/infrastructure/persistence/prisma/generated/client';

export function createAuthClient() {
  const url = readAccelerateUrl('auth-service');
  return new AuthPrismaClient({ accelerateUrl: url }).$extends(withAccelerate());
}

export type AuthClient = ReturnType<typeof createAuthClient>;

// ── Billing Service PrismaClient ────────────────────────────────────────────
import { PrismaClient as BillingPrismaClient } from '../../services/billing-service/src/infrastructure/persistence/prisma/generated/client';

export function createBillingClient() {
  const url = readAccelerateUrl('billing-service');
  return new BillingPrismaClient({ accelerateUrl: url }).$extends(withAccelerate());
}

export type BillingClient = ReturnType<typeof createBillingClient>;

// ── Upload Service PrismaClient ─────────────────────────────────────────────
import { PrismaClient as UploadPrismaClient } from '../../services/upload-service/src/infrastructure/persistence/prisma/generated/client';

export function createUploadClient() {
  const url = readAccelerateUrl('upload-service');
  return new UploadPrismaClient({ accelerateUrl: url }).$extends(withAccelerate());
}

export type UploadClient = ReturnType<typeof createUploadClient>;

// ── Content Access Service PrismaClient ─────────────────────────────────
import { PrismaClient as ContentAccessPrismaClient } from '../../services/content-access-service/src/infrastructure/persistence/prisma/generated/client';

export function createContentAccessClient() {
  const url = readAccelerateUrl('content-access-service');
  return new ContentAccessPrismaClient({ accelerateUrl: url }).$extends(withAccelerate());
}

export type ContentAccessClient = ReturnType<typeof createContentAccessClient>;
