import {
  RESOURCE_COUNT,
  TUTORIAL_COUNT,
  authUserIds,
  mediaFileIds,
  randInt,
  resourceIds,
  tutorialIds,
} from './ids';
import { getResourceS3Key, getTutorialS3Key } from './s3-uploader';

import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '../../services/upload-service/.env') });

export const EXTENSIONS_RES = ['pdf', 'docx', 'pptx', 'xlsx', 'zip'];
export const SUPABASE_URL =
  process.env.SUPABASE_PUBLIC_URL ||
  process.env.SUPABASE_URL ||
  'https://ijguebmaaetfredcztnx.supabase.co';
export const DEFAULT_BUCKET = process.env.SUPABASE_RESOURCE_BUCKET || 'unibuddy-content';

/** Export mapping so s3-uploader knows what extensions to use */
export const resourceExtMapping: Record<string, string> = {};

/** Generate 350 MediaFile records for upload-service (Postgres).
 *  First 200 → resources, next 150 → tutorials.
 *
 *  All records reference the shared S3 keys from the one-time upload
 *  (round-robin over the physical dummy files). */
export function genMediaFiles() {
  const files: any[] = [];

  // 200 resource files
  for (let i = 0; i < RESOURCE_COUNT; i++) {
    const ext = EXTENSIONS_RES[i % EXTENSIONS_RES.length];
    resourceExtMapping[mediaFileIds[i]] = ext;

    // Use the shared S3 key from the one-time upload
    const s3Key = getResourceS3Key(i);

    files.push({
      id: mediaFileIds[i],
      s3_key: s3Key,
      bucket: DEFAULT_BUCKET,
      file_size_bytes: BigInt(randInt(100000, 5000000)),
      original_filename: `resource_${i}.${ext}`,
      mime_type: ext === 'pdf' ? 'application/pdf' : `application/${ext}`,
      uploaded_by: authUserIds[i % authUserIds.length],
      status: 'AVAILABLE',
      content_id: resourceIds[i].toHexString(),
      content_type: 'resource',
      streaming_url: null,
      trailer_url: null,
      download_url: `${SUPABASE_URL}/storage/v1/object/public/${DEFAULT_BUCKET}/${s3Key}`,
      processing_error: null,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      preview_s3_key: null,
      preview_status: 'PENDING',
    });
  }

  // 150 tutorial video files
  for (let i = 0; i < TUTORIAL_COUNT; i++) {
    const mediaIdx = RESOURCE_COUNT + i;
    resourceExtMapping[mediaFileIds[mediaIdx]] = 'mp4';

    // Use the shared S3 key from the one-time upload
    const s3Key = getTutorialS3Key(i);

    files.push({
      id: mediaFileIds[mediaIdx],
      s3_key: s3Key,
      bucket: DEFAULT_BUCKET,
      file_size_bytes: BigInt(randInt(50000000, 500000000)),
      original_filename: `tutorial_${i}.mp4`,
      mime_type: 'video/mp4',
      uploaded_by: authUserIds[i % authUserIds.length],
      status: 'AVAILABLE',
      content_id: tutorialIds[i].toHexString(),
      content_type: 'tutorial',
      streaming_url: `${SUPABASE_URL}/storage/v1/object/public/${DEFAULT_BUCKET}/${s3Key}`,
      trailer_url: `${SUPABASE_URL}/storage/v1/object/public/${DEFAULT_BUCKET}/${s3Key}`,
      download_url: null,
      processing_error: null,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      preview_s3_key: `${s3Key.replace('.mp4', '_preview.jpg')}`,
      preview_status: 'AVAILABLE',
    });
  }

  return files;
}
