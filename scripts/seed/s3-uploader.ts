import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { config } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

// Load env from upload-service
config({ path: path.resolve(__dirname, '../../services/upload-service/.env') });

const s3Client = new S3Client({
  forcePathStyle: true,
  region: process.env.S3_REGION,
  endpoint: process.env.S3_URL,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

const defaultBucket = process.env.SUPABASE_RESOURCE_BUCKET || 'resources';

const DUMMY_DIR = path.resolve(__dirname, '../../dummy/data');

// ── Physical dummy files mapped to S3 keys ─────────────────────────────────
// Upload each physical file ONCE with a fixed key, then all seed records reuse them.

interface DummyFile {
  localPath: string;
  s3Key: string;
  contentType: string;
}

const DUMMY_RESOURCES: DummyFile[] = [
  {
    localPath: 'resources/test_pdf.pdf',
    s3Key: 'docs/seed/test_pdf.pdf',
    contentType: 'application/pdf',
  },
  {
    localPath: 'resources/test_doc.docx',
    s3Key: 'docs/seed/test_doc.docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    localPath: 'resources/react.docx',
    s3Key: 'docs/seed/react.docx',
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    localPath: 'resources/test-pptx.pptx',
    s3Key: 'docs/seed/test-pptx.pptx',
    contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  {
    localPath: 'resources/OOP JAVA.pdf',
    s3Key: 'docs/seed/oop-java.pdf',
    contentType: 'application/pdf',
  },
];

const DUMMY_TUTORIALS: DummyFile[] = [
  {
    localPath: 'tutorials/test_mp4.mp4',
    s3Key: 'videos/seed/test_mp4.mp4',
    contentType: 'video/mp4',
  },
  {
    localPath: 'tutorials/test_mp4_2.mp4',
    s3Key: 'videos/seed/test_mp4_2.mp4',
    contentType: 'video/mp4',
  },
  {
    localPath: 'tutorials/test_mp4_3.mp4',
    s3Key: 'videos/seed/test_mp4_3.mp4',
    contentType: 'video/mp4',
  },
  {
    localPath: 'tutorials/test_mp4_4.mp4',
    s3Key: 'videos/seed/test_mp4_4.mp4',
    contentType: 'video/mp4',
  },
  {
    localPath: 'tutorials/test_mp4_5.mp4',
    s3Key: 'videos/seed/test_mp4_5.mp4',
    contentType: 'video/mp4',
  },
];

/** Cached upload results: s3Key → public URL */
const cachedResourceKeys: string[] = [];
const cachedTutorialKeys: string[] = [];
let uploaded = false;

/**
 * Upload each unique physical file to S3 exactly once.
 * All seed media records then pick from these shared keys via round-robin.
 */
export async function uploadDummyMedia() {
  if (uploaded) return;

  console.log('[SEED-S3] Uploading unique dummy files to S3 (one-time)...');

  // Upload resource files
  for (const f of DUMMY_RESOURCES) {
    const fullPath = path.join(DUMMY_DIR, f.localPath);
    if (!existsSync(fullPath)) {
      console.warn(`[SEED-S3] Skipping missing file: ${f.localPath}`);
      continue;
    }
    const body = readFileSync(fullPath);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: defaultBucket,
        Key: f.s3Key,
        Body: body,
        ContentType: f.contentType,
      }),
    );
    cachedResourceKeys.push(f.s3Key);
    console.log(`[SEED-S3] ✓ ${f.s3Key} (${(body.length / 1024).toFixed(0)} KB)`);
  }

  // Upload tutorial files
  for (const f of DUMMY_TUTORIALS) {
    const fullPath = path.join(DUMMY_DIR, f.localPath);
    if (!existsSync(fullPath)) {
      console.warn(`[SEED-S3] Skipping missing file: ${f.localPath}`);
      continue;
    }
    const body = readFileSync(fullPath);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: defaultBucket,
        Key: f.s3Key,
        Body: body,
        ContentType: f.contentType,
      }),
    );
    cachedTutorialKeys.push(f.s3Key);
    console.log(`[SEED-S3] ✓ ${f.s3Key} (${(body.length / 1024).toFixed(0)} KB)`);
  }

  uploaded = true;
  console.log(
    `[SEED-S3] Done! ${cachedResourceKeys.length} resource files + ${cachedTutorialKeys.length} tutorial files uploaded.`,
  );
}

/**
 * Get a shared S3 key for a resource record (round-robin over uploaded files).
 */
export function getResourceS3Key(index: number): string {
  if (cachedResourceKeys.length === 0) {
    throw new Error('[SEED-S3] No resource files uploaded yet. Call uploadDummyMedia() first.');
  }
  return cachedResourceKeys[index % cachedResourceKeys.length];
}

/**
 * Get a shared S3 key for a tutorial record (round-robin over uploaded files).
 */
export function getTutorialS3Key(index: number): string {
  if (cachedTutorialKeys.length === 0) {
    throw new Error('[SEED-S3] No tutorial files uploaded yet. Call uploadDummyMedia() first.');
  }
  return cachedTutorialKeys[index % cachedTutorialKeys.length];
}
