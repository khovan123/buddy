import { config } from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

// Load env from upload-service (same source of truth)
config({ path: path.resolve(__dirname, '../../services/upload-service/.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dagcayfji';
const ASSET_FOLDER = process.env.CLOUDINARY_ASSET_FOLDER || 'buddy';
const THUMBNAIL_FOLDER = process.env.CLOUDINARY_THUMBNAIL_FOLDER || 'thumbnails';
const TRAILER_FOLDER = process.env.CLOUDINARY_TRAILER_FOLDER || 'trailers';
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'buddy';

/**
 * Constructs a Cloudinary trailer URL for seed data.
 * Matches the video-processor worker pattern:
 *   cloudinary/{ASSET_FOLDER}/{TRAILER_FOLDER}/trailer-{fileId}
 */
export function getSeedTrailerUrl(fileId: string): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/${ASSET_FOLDER}/${TRAILER_FOLDER}/trailer-${fileId}`;
}

let cachedThumbnailUrl: string | null = null;

/**
 * Upload the default seed thumbnail image to Cloudinary.
 * Uses the same folder structure as CloudinaryService.uploadThumbnail:
 *   {ASSET_FOLDER}/{THUMBNAIL_FOLDER}/seed/og-default
 *
 * Caches the URL so subsequent calls are free.
 */
export async function uploadSeedThumbnail(): Promise<string> {
  if (cachedThumbnailUrl) return cachedThumbnailUrl;

  console.log('[SEED-CLOUDINARY] Uploading seed thumbnail to Cloudinary...');

  const imgPath = path.resolve(__dirname, '../../dummy/data/images/og-default.png');
  const imageBuffer = readFileSync(imgPath);

  const url = await new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `${ASSET_FOLDER}/${THUMBNAIL_FOLDER}/seed`,
        public_id: 'og-default',
        overwrite: true,
        resource_type: 'image',
        transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto' }],
        upload_preset: UPLOAD_PRESET,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result?.secure_url) {
          reject(new Error('Cloudinary upload did not return secure_url'));
          return;
        }
        resolve(result.secure_url);
      },
    );

    uploadStream.end(imageBuffer);
  });

  cachedThumbnailUrl = url;
  console.log(`[SEED-CLOUDINARY] Thumbnail uploaded: ${url}`);
  return url;
}

/**
 * Returns the cached thumbnail URL.
 * Must call uploadSeedThumbnail() first during seed orchestration.
 */
export function getSeedThumbnailUrl(): string {
  if (!cachedThumbnailUrl) {
    throw new Error(
      '[SEED-CLOUDINARY] Thumbnail not yet uploaded. Call uploadSeedThumbnail() before generating content.',
    );
  }
  return cachedThumbnailUrl;
}
