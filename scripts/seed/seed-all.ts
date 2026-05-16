import { readFileSync } from 'fs';
import { MongoClient, ObjectId } from 'mongodb';
import path from 'path';
import { Client } from 'pg';

import { uploadSeedThumbnail } from './cloudinary-uploader';
import { genCourses, genMajors } from './gen-academics';
import { genUserResourceAccess } from './gen-access';
import {
  genPayoutAccounts,
  genUserResourceOwnership,
  genWalletTransactions,
} from './gen-billing-data';
import { genCareers, genSkills } from './gen-careers';
import {
  applyCollectionBacklinks,
  genCollections,
  genResources,
  genTutorials,
} from './gen-content';
import { genInteractions } from './gen-interactions';
import { genMediaFiles } from './gen-media';
import { genNotifications } from './gen-notifications';
import { genFollows, genUserRatings } from './gen-social';
import { genAuthUsers, genSubscriptions, genUserProfiles, genWallets } from './gen-users';
import { uploadDummyMedia } from './s3-uploader';

// ── Config ─────────────────────────────────────────────────────────────────
const shouldClean = process.argv.includes('--clean');
const isProd = process.argv.includes('--prod');

const SERVICES_DIR = path.resolve(__dirname, '../../services');

// ── Helpers ────────────────────────────────────────────────────────────────
function log(msg: string) {
  console.log(`[SEED] ${new Date().toISOString()} — ${msg}`);
}

/** Read the MONGO_URI from a service's .env or .env.prod */
function getMongoUri(serviceName: string): string {
  const envFile = isProd ? '.env.prod' : '.env';
  const envPath = path.resolve(SERVICES_DIR, serviceName, envFile);
  const content = readFileSync(envPath, 'utf-8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('MONGO_URI=')) {
      return trimmed.replace('MONGO_URI=', '');
    }
  }
  return 'mongodb://127.0.0.1:27018';
}

// ── Postgres Abstraction ───────────────────────────────────────────────────
//
// LOCAL mode  → raw pg.Client (single local PG, separate databases)
// PROD mode   → Prisma Client + Accelerate (each service has its own DB)
//
// The PgAdapter interface unifies both behind upsert/deleteAll methods
// so the seeding logic doesn't branch per mode.

interface PgAdapter {
  seedAuthUsers(users: any[]): Promise<void>;
  seedWallets(wallets: any[]): Promise<void>;
  seedSubscriptions(subs: any[]): Promise<void>;
  seedMediaFiles(files: any[]): Promise<void>;
  seedWalletTransactions(txns: any[]): Promise<void>;
  seedUserResourceOwnership(ownerships: any[]): Promise<void>;
  seedPayoutAccounts(accounts: any[]): Promise<void>;
  seedUserResourceAccess(accesses: any[]): Promise<void>;
  cleanAuth(): Promise<void>;
  cleanBilling(): Promise<void>;
  cleanUpload(): Promise<void>;
  cleanContentAccess(): Promise<void>;
  close(): Promise<void>;
}

// ── LOCAL: raw pg.Client ───────────────────────────────────────────────────

async function createLocalPgAdapter(): Promise<PgAdapter> {
  const connect = async (db: string) => {
    const c = new Client({
      host: '127.0.0.1',
      port: 5432,
      user: 'postgres',
      password: 'postgres123',
      database: db,
    });
    await c.connect();
    return c;
  };

  const pgAuth = await connect('auth_db');
  const pgBilling = await connect('billing_db');
  const pgUpload = await connect('upload_db');
  const pgContentAccess = await connect('content_access_db');

  return {
    async seedAuthUsers(users) {
      for (const u of users) {
        await pgAuth.query(
          `INSERT INTO users (id, email, password_hash, nickname, roles, subscription_plan, status, email_verified, last_login_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO NOTHING`,
          [
            u.id,
            u.email,
            u.password_hash,
            u.nickname,
            u.roles,
            u.subscription_plan,
            u.status,
            u.email_verified,
            u.last_login_at,
            u.created_at,
            u.updated_at,
          ],
        );
      }
    },

    async seedWallets(wallets) {
      for (const w of wallets) {
        await pgBilling.query(
          `INSERT INTO wallets (id, user_id, balance_in_cents, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id) DO NOTHING`,
          [w.id, w.user_id, w.balance_in_cents, w.created_at, w.updated_at],
        );
      }
    },

    async seedSubscriptions(subs) {
      for (const s of subs) {
        await pgBilling.query(
          `INSERT INTO subscriptions (id, user_id, plan, status, starts_at, expires_at, created_at, updated_at)
           VALUES ($1, $2, $3::"SubscriptionPlan", $4::"SubscriptionStatus", $5, $6, $7, $8)
           ON CONFLICT (user_id) DO NOTHING`,
          [
            s.id,
            s.user_id,
            s.plan,
            s.status,
            s.starts_at,
            s.expires_at,
            s.created_at,
            s.updated_at,
          ],
        );
      }
    },

    async seedMediaFiles(files) {
      for (const m of files) {
        await pgUpload.query(
          `INSERT INTO media_files (id, s3_key, bucket, file_size_bytes, original_filename, mime_type, uploaded_by, status, content_id, content_type, streaming_url, trailer_url, download_url, processing_error, deleted_at, created_at, updated_at, preview_s3_key, preview_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::"MediaProcessingStatus",$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::"MediaProcessingStatus")
           ON CONFLICT (id) DO NOTHING`,
          [
            m.id,
            m.s3_key,
            m.bucket,
            m.file_size_bytes,
            m.original_filename,
            m.mime_type,
            m.uploaded_by,
            m.status,
            m.content_id,
            m.content_type,
            m.streaming_url,
            m.trailer_url,
            m.download_url,
            m.processing_error,
            m.deleted_at,
            m.created_at,
            m.updated_at,
            m.preview_s3_key,
            m.preview_status,
          ],
        );
      }
    },

    async seedWalletTransactions(txns) {
      for (const t of txns) {
        await pgBilling.query(
          `INSERT INTO wallet_transactions (id, wallet_id, user_id, type, status, provider, amount_in_cents, currency, external_ref, idempotency_key, metadata, created_at, confirmed_at)
           VALUES ($1,$2,$3,$4::"TransactionType",$5::"TransactionStatus",$6::"PaymentProvider",$7,$8,$9,$10,$11::jsonb,$12,$13)
           ON CONFLICT (id) DO NOTHING`,
          [
            t.id,
            t.wallet_id,
            t.user_id,
            t.type,
            t.status,
            t.provider,
            t.amount_in_cents,
            t.currency,
            t.external_ref,
            t.idempotency_key,
            t.metadata,
            t.created_at,
            t.confirmed_at,
          ],
        );
      }
    },

    async seedUserResourceOwnership(ownerships) {
      for (const o of ownerships) {
        await pgBilling.query(
          `INSERT INTO user_resource_ownership (id, user_id, resource_id, granted_at)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (id) DO NOTHING`,
          [o.id, o.user_id, o.resource_id, o.granted_at],
        );
      }
    },

    async seedPayoutAccounts(accounts) {
      for (const a of accounts) {
        await pgBilling.query(
          `INSERT INTO payout_accounts (id, user_id, bank_bin, bank_account_number, bank_account_name, bank_name, verified, verified_at, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (user_id) DO NOTHING`,
          [
            a.id,
            a.user_id,
            a.bank_bin,
            a.bank_account_number,
            a.bank_account_name,
            a.bank_name,
            a.verified,
            a.verified_at,
            a.created_at,
            a.updated_at,
          ],
        );
      }
    },

    async seedUserResourceAccess(accesses) {
      for (const a of accesses) {
        await pgContentAccess.query(
          `INSERT INTO user_resource_access (id, user_id, resource_id, resource_type, purchase_id, granted_at, deleted_at)
           VALUES ($1,$2,$3,$4::"ResourceType",$5,$6,$7)
           ON CONFLICT (id) DO NOTHING`,
          [
            a.id,
            a.user_id,
            a.resource_id,
            a.resource_type,
            a.purchase_id,
            a.granted_at,
            a.deleted_at,
          ],
        );
      }
    },

    async cleanAuth() {
      await pgAuth.query('DELETE FROM refresh_tokens');
      await pgAuth.query('DELETE FROM users');
    },

    async cleanBilling() {
      await pgBilling.query('DELETE FROM outbox');
      await pgBilling.query('DELETE FROM user_resource_ownership');
      await pgBilling.query('DELETE FROM payout_accounts');
      await pgBilling.query('DELETE FROM wallet_transactions');
      await pgBilling.query('DELETE FROM wallets');
      await pgBilling.query('DELETE FROM subscriptions');
    },

    async cleanUpload() {
      await pgUpload.query('DELETE FROM outbox');
      await pgUpload.query('DELETE FROM media_files');
    },

    async cleanContentAccess() {
      await pgContentAccess.query('DELETE FROM user_resource_access');
    },

    async close() {
      await pgAuth.end();
      await pgBilling.end();
      await pgUpload.end();
      await pgContentAccess.end();
    },
  };
}

// ── PROD: Prisma Client + Accelerate ───────────────────────────────────────

async function createProdPgAdapter(): Promise<PgAdapter> {
  const { createAuthClient, createBillingClient, createUploadClient, createContentAccessClient } =
    await import('./prisma-clients.js');

  const authClient = createAuthClient();
  const billingClient = createBillingClient();
  const uploadClient = createUploadClient();
  const contentAccessClient = createContentAccessClient();

  await Promise.all([
    authClient.$connect(),
    billingClient.$connect(),
    uploadClient.$connect(),
    contentAccessClient.$connect(),
  ]);
  log('Connected to all Prisma Accelerate instances');

  return {
    async seedAuthUsers(users) {
      for (const u of users) {
        await (authClient as any).user.upsert({
          where: { id: u.id },
          update: {},
          create: {
            id: u.id,
            email: u.email,
            passwordHash: u.password_hash,
            nickname: u.nickname,
            roles: u.roles,
            subscriptionPlan: u.subscription_plan,
            status: u.status,
            emailVerified: u.email_verified,
            lastLoginAt: u.last_login_at,
            createdAt: u.created_at,
            updatedAt: u.updated_at,
          },
        });
      }
    },

    async seedWallets(wallets) {
      for (const w of wallets) {
        await (billingClient as any).wallet.upsert({
          where: { userId: w.user_id },
          update: {},
          create: {
            id: w.id,
            userId: w.user_id,
            balanceInCents: w.balance_in_cents,
            createdAt: w.created_at,
            updatedAt: w.updated_at,
          },
        });
      }
    },

    async seedSubscriptions(subs) {
      for (const s of subs) {
        await (billingClient as any).subscription.upsert({
          where: { userId: s.user_id },
          update: {},
          create: {
            id: s.id,
            userId: s.user_id,
            plan: s.plan,
            status: s.status,
            startsAt: s.starts_at,
            expiresAt: s.expires_at,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
          },
        });
      }
    },

    async seedMediaFiles(files) {
      for (const m of files) {
        await (uploadClient as any).mediaFile.upsert({
          where: { id: m.id },
          update: {},
          create: {
            id: m.id,
            s3Key: m.s3_key,
            bucket: m.bucket,
            fileSizeBytes: m.file_size_bytes,
            originalFilename: m.original_filename,
            mimeType: m.mime_type,
            uploadedBy: m.uploaded_by,
            status: m.status,
            contentId: m.content_id,
            contentType: m.content_type,
            streamingUrl: m.streaming_url,
            trailerUrl: m.trailer_url,
            downloadUrl: m.download_url,
            processingError: m.processing_error,
            deletedAt: m.deleted_at,
            createdAt: m.created_at,
            updatedAt: m.updated_at,
            previewS3Key: m.preview_s3_key,
            previewStatus: m.preview_status,
          },
        });
      }
    },

    async seedWalletTransactions(txns) {
      for (const t of txns) {
        await (billingClient as any).walletTransaction.create({
          data: {
            id: t.id,
            walletId: t.wallet_id,
            userId: t.user_id,
            type: t.type,
            status: t.status,
            provider: t.provider,
            amountInCents: t.amount_in_cents,
            currency: t.currency,
            externalRef: t.external_ref,
            idempotencyKey: t.idempotency_key,
            metadata: t.metadata ? JSON.parse(t.metadata) : undefined,
            createdAt: t.created_at,
            confirmedAt: t.confirmed_at,
          },
        });
      }
    },

    async seedUserResourceOwnership(ownerships) {
      for (const o of ownerships) {
        await (billingClient as any).userResourceOwnership.create({
          data: {
            id: o.id,
            userId: o.user_id,
            resourceId: o.resource_id,
            grantedAt: o.granted_at,
          },
        });
      }
    },

    async seedPayoutAccounts(accounts) {
      for (const a of accounts) {
        await (billingClient as any).payoutAccount.upsert({
          where: { userId: a.user_id },
          update: {},
          create: {
            id: a.id,
            userId: a.user_id,
            bankBin: a.bank_bin,
            bankAccountNumber: a.bank_account_number,
            bankAccountName: a.bank_account_name,
            bankName: a.bank_name,
            verified: a.verified,
            verifiedAt: a.verified_at,
            createdAt: a.created_at,
            updatedAt: a.updated_at,
          },
        });
      }
    },

    async seedUserResourceAccess(accesses) {
      for (const a of accesses) {
        await (contentAccessClient as any).userResourceAccess.create({
          data: {
            id: a.id,
            userId: a.user_id,
            resourceId: a.resource_id,
            resourceType: a.resource_type,
            purchaseId: a.purchase_id,
            grantedAt: a.granted_at,
            deletedAt: a.deleted_at,
          },
        });
      }
    },

    async cleanAuth() {
      await (authClient as any).refreshToken.deleteMany();
      await (authClient as any).user.deleteMany();
    },

    async cleanBilling() {
      await (billingClient as any).userResourceOwnership.deleteMany();
      await (billingClient as any).payoutAccount.deleteMany();
      await (billingClient as any).walletTransaction.deleteMany();
      await (billingClient as any).wallet.deleteMany();
      await (billingClient as any).subscription.deleteMany();
    },

    async cleanUpload() {
      await (uploadClient as any).mediaFile.deleteMany();
    },

    async cleanContentAccess() {
      await (contentAccessClient as any).userResourceAccess.deleteMany();
    },

    async close() {
      await authClient.$disconnect();
      await billingClient.$disconnect();
      await uploadClient.$disconnect();
      await contentAccessClient.$disconnect();
    },
  };
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  log(`Starting seed... (mode: ${isProd ? 'PROD' : 'LOCAL'})`);

  // ── Mongo connections (one per service that owns data) ───────────
  const mongoContentUri = getMongoUri('content-service');
  const mongoUserUri = getMongoUri('user-service');
  const mongoInteractionUri = getMongoUri('interaction-service');
  const mongoRecUri = getMongoUri('recommendation-service');
  const mongoNotifUri = getMongoUri('notification-service');

  const mongoContent = new MongoClient(mongoContentUri);
  const mongoUser = new MongoClient(mongoUserUri);
  const mongoInteraction = new MongoClient(mongoInteractionUri);
  const mongoRec = new MongoClient(mongoRecUri);
  const mongoNotif = new MongoClient(mongoNotifUri);

  await Promise.all([
    mongoContent.connect(),
    mongoUser.connect(),
    mongoInteraction.connect(),
    mongoRec.connect(),
    mongoNotif.connect(),
  ]);

  const contentDb = mongoContent.db('content_db');
  const userDb = mongoUser.db('user_db');
  const interactionDb = mongoInteraction.db('interaction_db');
  const recDb = mongoRec.db('recommendation_db');
  const notifDb = mongoNotif.db('notification_db');

  // ── Postgres adapter (local pg.Client or Prisma Accelerate) ─────
  const pg = isProd ? await createProdPgAdapter() : await createLocalPgAdapter();

  try {
    // ── Clean (optional) ──────────────────────────────────────────
    if (shouldClean) {
      log('Cleaning existing data...');
      // Mongo
      await contentDb.collection('Majors').deleteMany({});
      await contentDb.collection('Courses').deleteMany({});
      await contentDb.collection('Resources').deleteMany({});
      await contentDb.collection('Tutorials').deleteMany({});
      await contentDb.collection('Collections').deleteMany({});
      await userDb.collection('Users').deleteMany({});
      await userDb.collection('Careers').deleteMany({});
      await userDb.collection('HighlightSkills').deleteMany({});
      await userDb.collection('Follows').deleteMany({});
      await userDb.collection('UserRatings').deleteMany({});
      await interactionDb.collection('interactions').deleteMany({});
      await notifDb.collection('notifications').deleteMany({});
      // Recommendation materialized views
      await recDb.collection('catalog_items').deleteMany({});
      await recDb.collection('catalog_courses').deleteMany({});
      await recDb.collection('catalog_majors').deleteMany({});
      await recDb.collection('catalog_user_profiles').deleteMany({});
      await recDb.collection('user_interaction_profiles').deleteMany({});
      await recDb.collection('item_popularity').deleteMany({});
      // Postgres
      await pg.cleanContentAccess();
      await pg.cleanAuth();
      await pg.cleanBilling();
      await pg.cleanUpload();
      log('Clean complete.');
    }

    // ── 1. Majors ─────────────────────────────────────────────────
    const majors = genMajors();
    await contentDb.collection('Majors').insertMany(majors);
    log(`✓ Majors: ${majors.length}`);

    // ── 2. Courses ────────────────────────────────────────────────
    const courses = genCourses();
    await contentDb.collection('Courses').insertMany(courses);
    log(`✓ Courses: ${courses.length}`);

    // ── 3. Careers ────────────────────────────────────────────────
    const careers = genCareers();
    await userDb.collection('Careers').insertMany(careers);
    log(`✓ Careers: ${careers.length}`);

    // ── 4. Skills ─────────────────────────────────────────────────
    const skills = genSkills();
    await userDb.collection('HighlightSkills').insertMany(skills);
    log(`✓ Skills: ${skills.length}`);

    // ── 5. Auth Users (PG) ────────────────────────────────────────
    const authUsers = await genAuthUsers();
    await pg.seedAuthUsers(authUsers);
    log(`✓ Auth Users: ${authUsers.length}`);

    // ── 6. User Profiles (Mongo) ──────────────────────────────────
    const profiles = genUserProfiles();
    await userDb.collection('Users').insertMany(profiles);
    log(`✓ User Profiles: ${profiles.length}`);

    // ── 7. Wallets (PG) ───────────────────────────────────────────
    const wallets = genWallets();
    await pg.seedWallets(wallets);
    log(`✓ Wallets: ${wallets.length}`);

    // ── 8. Subscriptions (PG) ─────────────────────────────────────
    const subs = genSubscriptions();
    await pg.seedSubscriptions(subs);
    log(`✓ Subscriptions: ${subs.length}`);

    // ── 9. Seed Thumbnail (Cloudinary) + S3 dummy files ─────────────
    // Must run before content generators since they read the cached URL + S3 keys
    await uploadSeedThumbnail();
    log('✓ Seed thumbnail uploaded to Cloudinary');

    await uploadDummyMedia();
    log('✓ Dummy files uploaded to S3 (one-time)');

    // ── 10. Resources ──────────────────────────────────────────────
    const resources = genResources();
    log(`  Generated ${resources.length} resources (not inserted yet)`);

    // ── 11. Tutorials ─────────────────────────────────────────────
    const tutorials = genTutorials();
    log(`  Generated ${tutorials.length} tutorials (not inserted yet)`);

    // ── 12. Collections ───────────────────────────────────────────
    const collections = genCollections();
    log(`  Generated ${collections.length} collections (not inserted yet)`);

    // ── 12a. Apply cross-entity backlinks ──────────────────────────
    // This simulates what handlers do post-creation:
    //   - resource.tutorialId ← tutorial that includes it
    //   - resource.collectionId ← collection that includes it
    //   - tutorial.collectionId/collectionIds ← collection that includes it
    applyCollectionBacklinks(resources, tutorials, collections);
    log('✓ Applied collection backlinks');

    // Now insert all content with backlinks applied
    await contentDb.collection('Resources').insertMany(resources);
    log(`✓ Resources: ${resources.length}`);
    await contentDb.collection('Tutorials').insertMany(tutorials);
    log(`✓ Tutorials: ${tutorials.length}`);
    await contentDb.collection('Collections').insertMany(collections);
    log(`✓ Collections: ${collections.length}`);

    // ── 13. Media Files (PG) ──────────────────────────────────────
    const mediaFiles = genMediaFiles();

    await pg.seedMediaFiles(mediaFiles);
    log(`✓ Media Files: ${mediaFiles.length}`);

    // ── 14. Interactions ──────────────────────────────────────────
    const interactions = genInteractions(2500);
    await interactionDb.collection('interactions').insertMany(interactions);
    log(`✓ Interactions: ${interactions.length}`);

    // ── 15. Recommendation DB Materialized Views ──────────────────
    // catalog_items: items the trainer uses
    const catalogItems = [
      ...resources.map((r: any) => ({
        itemId: r._id.toHexString(),
        itemType: 'RESOURCE',
        majorId: r.majorId.toHexString(),
        courseId: r.courseId.toHexString(),
        title: r.title,
        createdAt: r.createdAt,
        lastSynced: new Date(),
      })),
      ...tutorials.map((t: any) => ({
        itemId: t._id.toHexString(),
        itemType: 'TUTORIAL',
        majorId: t.majorId.toHexString(),
        courseId: t.courseId.toHexString(),
        title: t.title,
        createdAt: t.createdAt,
        lastSynced: new Date(),
      })),
      ...collections.map((c: any) => ({
        itemId: c._id.toHexString(),
        itemType: c.type === 'TUTORIAL' ? 'TUTORIAL_COLLECTION' : 'RESOURCE_COLLECTION',
        majorId: c.majorId.toHexString(),
        courseId: c.courseId.toHexString(),
        title: c.title,
        createdAt: c.createdAt,
        lastSynced: new Date(),
      })),
    ];
    await recDb.collection('catalog_items').insertMany(catalogItems);
    log(`✓ Catalog Items (rec_db): ${catalogItems.length}`);

    // catalog_courses
    const catalogCourses = courses.map((c: any) => ({
      courseId: c._id.toHexString(),
      majorId: c.majorId.toHexString(),
      semester: c.semester,
      code: c.code,
      name: c.name,
      lastSynced: new Date(),
    }));
    await recDb.collection('catalog_courses').insertMany(catalogCourses);
    log(`✓ Catalog Courses (rec_db): ${catalogCourses.length}`);

    // catalog_majors
    const catalogMajors = majors.map((m: any) => ({
      majorId: m._id.toHexString(),
      code: m.code,
      name: m.name,
      lastSynced: new Date(),
    }));
    await recDb.collection('catalog_majors').insertMany(catalogMajors);
    log(`✓ Catalog Majors (rec_db): ${catalogMajors.length}`);

    // catalog_user_profiles (user metadata for the trainer)
    const catalogUserProfiles = profiles.map((p: any) => ({
      userId: p.userId,
      majorId: p.profile.majorId.toHexString(),
      courseId: p.profile.courseId?.toHexString() || '',
      semester: p.profile.semester || 1,
      careerId: p.profile.careerId?.toHexString() || '',
      skillIds: (p.profile.skillIds || []).map((s: any) => s.toHexString()),
      lastSynced: new Date(),
    }));
    await recDb.collection('catalog_user_profiles').insertMany(catalogUserProfiles);
    log(`✓ Catalog User Profiles (rec_db): ${catalogUserProfiles.length}`);

    // user_interaction_profiles (aggregated per-user interaction data)
    const userInteractionMap = new Map<string, any>();
    for (const ix of interactions) {
      const uid = ix.userId;
      if (!userInteractionMap.has(uid)) {
        userInteractionMap.set(uid, {
          _id: new ObjectId(),
          userId: uid,
          totalInteractions: 0,
          recentItems: [],
          majorAffinities: {} as Record<string, number>,
          courseAffinities: {} as Record<string, number>,
          purchasedItemIds: [],
          lastUpdated: new Date(),
        });
      }
      const profile = userInteractionMap.get(uid)!;
      profile.totalInteractions++;
      profile.recentItems.push({
        itemId: ix.itemId,
        itemType: ix.itemType,
        action: ix.action,
        weight: ix.weight,
        at: ix.createdAt,
      });
      const majorId = ix.metadata.majorId;
      const courseId = ix.metadata.courseId;
      if (majorId)
        profile.majorAffinities[majorId] = (profile.majorAffinities[majorId] || 0) + ix.weight;
      if (courseId)
        profile.courseAffinities[courseId] = (profile.courseAffinities[courseId] || 0) + ix.weight;
      if (ix.action === 'PURCHASE') profile.purchasedItemIds.push(ix.itemId);
    }
    // Keep last 100 items per user
    for (const p of userInteractionMap.values()) {
      p.recentItems = p.recentItems.slice(-100);
    }
    const userProfiles = Array.from(userInteractionMap.values());
    if (userProfiles.length > 0) {
      await recDb.collection('user_interaction_profiles').insertMany(userProfiles);
    }
    log(`✓ User Interaction Profiles (rec_db): ${userProfiles.length}`);

    // item_popularity (aggregated per-item stats)
    const itemPopMap = new Map<string, any>();
    for (const ix of interactions) {
      const iid = ix.itemId;
      if (!itemPopMap.has(iid)) {
        itemPopMap.set(iid, {
          _id: new ObjectId(),
          itemId: iid,
          itemType: ix.itemType,
          majorId: ix.metadata.majorId || '',
          courseId: ix.metadata.courseId || '',
          semester: ix.metadata.semester || 0,
          trendingScore: 0,
          stats: {
            viewCount: 0,
            likeCount: 0,
            commentCount: 0,
            downloadCount: 0,
            purchaseCount: 0,
            ratingSum: 0,
            ratingCount: 0,
          },
          lastUpdated: new Date(),
        });
      }
      const item = itemPopMap.get(iid)!;
      const statsMap: Record<string, string> = {
        VIEW_PREVIEW: 'viewCount',
        LIKE: 'likeCount',
        COMMENT: 'commentCount',
        DOWNLOAD: 'downloadCount',
        PURCHASE: 'purchaseCount',
      };
      if (statsMap[ix.action]) item.stats[statsMap[ix.action]]++;
      if (ix.action === 'UNLIKE') item.stats.likeCount = Math.max(0, item.stats.likeCount - 1);
      if (ix.action === 'RATING') {
        item.stats.ratingSum += ix.metadata.ratingValue || 3;
        item.stats.ratingCount++;
      }
    }
    // Compute trending scores
    for (const item of itemPopMap.values()) {
      const s = item.stats;
      item.trendingScore =
        s.viewCount +
        s.likeCount * 5 +
        s.downloadCount * 8 +
        s.purchaseCount * 10 +
        s.commentCount * 6;
    }
    const itemPops = Array.from(itemPopMap.values());
    if (itemPops.length > 0) {
      await recDb.collection('item_popularity').insertMany(itemPops);
    }
    log(`✓ Item Popularity (rec_db): ${itemPops.length}`);

    // ── 16. Social: Follows + Ratings (Mongo) ─────────────────────
    const follows = genFollows(200);
    await userDb.collection('Follows').insertMany(follows);
    log(`✓ Follows: ${follows.length}`);

    const userRatings = genUserRatings(150);
    await userDb.collection('UserRatings').insertMany(userRatings);
    log(`✓ User Ratings: ${userRatings.length}`);

    // ── 17. Wallet Transactions (PG) ──────────────────────────────
    const walletIdsByUser = new Map(wallets.map((w: any) => [w.user_id, w.id]));
    const walletTxns = genWalletTransactions(walletIdsByUser, 300);
    await pg.seedWalletTransactions(walletTxns);
    log(`✓ Wallet Transactions: ${walletTxns.length}`);

    // ── 18. Resource Ownership (PG) ───────────────────────────────
    const ownerships = genUserResourceOwnership();
    await pg.seedUserResourceOwnership(ownerships);
    log(`✓ Resource Ownership: ${ownerships.length}`);

    // ── 19. Payout Accounts (PG) ─────────────────────────────────
    const payoutAccounts = genPayoutAccounts();
    await pg.seedPayoutAccounts(payoutAccounts);
    log(`✓ Payout Accounts: ${payoutAccounts.length}`);

    // ── 20. User Resource Access (PG) ────────────────────────────
    const accesses = genUserResourceAccess();
    await pg.seedUserResourceAccess(accesses);
    log(`✓ User Resource Access: ${accesses.length}`);

    // ── 21. Notifications (Mongo) ────────────────────────────────
    const notifications = genNotifications(200);
    await notifDb.collection('notifications').insertMany(notifications);
    log(`✓ Notifications: ${notifications.length}`);

    // ── Summary ───────────────────────────────────────────────────
    log('');
    log('══════════════ SEED COMPLETE ══════════════');
    log(`Majors:          ${majors.length}`);
    log(`Courses:         ${courses.length}`);
    log(`Careers:         ${careers.length}`);
    log(`Skills:          ${skills.length}`);
    log(`Auth Users:      ${authUsers.length}`);
    log(`User Profiles:   ${profiles.length}`);
    log(`Wallets:         ${wallets.length}`);
    log(`Subscriptions:   ${subs.length}`);
    log(`Resources:       ${resources.length}`);
    log(`Tutorials:       ${tutorials.length}`);
    log(`Collections:     ${collections.length}`);
    log(`Media Files:     ${mediaFiles.length}`);
    log(`Interactions:    ${interactions.length}`);
    log(`Follows:         ${follows.length}`);
    log(`User Ratings:    ${userRatings.length}`);
    log(`Wallet Txns:     ${walletTxns.length}`);
    log(`Ownership:       ${ownerships.length}`);
    log(`Payout Accounts: ${payoutAccounts.length}`);
    log(`Access Records:  ${accesses.length}`);
    log(`Notifications:   ${notifications.length}`);
    log('═══════════════════════════════════════════');
  } finally {
    await mongoContent.close();
    await mongoUser.close();
    await mongoInteraction.close();
    await mongoRec.close();
    await mongoNotif.close();
    await pg.close();
    log('All connections closed.');
  }
}

main().catch((err) => {
  console.error('[SEED] Fatal error:', err);
  process.exit(1);
});
