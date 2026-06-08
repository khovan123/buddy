import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/** Service handling business logic for  s3. */
@Injectable()
export class S3Service implements OnModuleDestroy {
  private s3Client: S3Client;
  private readonly defaultBucket: string;
  private readonly publicUrlBase: string;
  private readonly presignedUrlExpirationSeconds: number;
  private readonly hlsUploadConcurrency: number;

  constructor(private readonly configService: ConfigService) {
    // Đổi tên biến config nếu cần thiết để rành mạch (VD: SUPABASE_BUCKET)
    this.defaultBucket = this.configService.get<string>('SUPABASE_RESOURCE_BUCKET', 'resources');
    this.publicUrlBase =
      this.configService.get<string>('SUPABASE_PUBLIC_URL') ||
      this.configService.get<string>('SUPABASE_URL', '');
    this.presignedUrlExpirationSeconds = parseInt(
      this.configService.get<string>('PRESIGNED_URL_EXPIRATION_SECONDS', '900'),
      10,
    );
    this.hlsUploadConcurrency = Math.max(
      1,
      parseInt(this.configService.get<string>('HLS_UPLOAD_CONCURRENCY', '4'), 10),
    );
    this.s3Client = new S3Client({
      forcePathStyle: true,
      region: this.configService.get('S3_REGION'),
      endpoint: this.configService.get('S3_URL'),
      credentials: {
        accessKeyId: this.configService.get('S3_ACCESS_KEY_ID')!,
        secretAccessKey: this.configService.get('S3_SECRET_KEY')!,
      },
    });
  }

  /**
   * Generate presigned URL.
   * Cập nhật thêm tham số `uploadType` để phân tách thư mục/bucket rõ ràng.
   */
  async generatePresignedUploadUrl(
    fileName?: string,
    uploadType: 'tutorial' | 'resource' = 'resource',
    keyPrefix?: string,
  ): Promise<{
    fileKey: string;
    uploadUrl: string;
    bucket: string;
    mimeType: string;
  }> {
    const timestamp = Date.now();
    const fileExtension = this.extractFileExtension(fileName);

    // Phân loại thư mục lưu trữ dựa trên uploadType
    const folder = uploadType === 'tutorial' ? 'videos' : 'docs';
    const normalizedPrefix = keyPrefix?.replace(/^\/+|\/+$/g, '') || folder;
    const fileKey = `${normalizedPrefix}/${randomUUID()}-${timestamp}${fileExtension}`;

    const mimeType = this.resolveMimeType(fileName);
    const putCommand = new PutObjectCommand({
      Bucket: this.defaultBucket,
      Key: fileKey,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, putCommand, {
      expiresIn: this.presignedUrlExpirationSeconds,
    });

    return {
      fileKey,
      uploadUrl,
      bucket: this.defaultBucket,
      mimeType,
    };
  }

  /**
   * 🚀 NEW: Tải file từ S3 về ổ cứng cục bộ (Dùng cho Video Worker)
   * Sử dụng stream pipeline để tối ưu RAM khi tải file lớn (vài GB)
   */
  async downloadFile(s3Key: string, destPath: string): Promise<void> {
    const command = new GetObjectCommand({
      Bucket: this.defaultBucket,
      Key: s3Key,
    });

    const response = await this.s3Client.send(command);

    if (!response.Body) {
      throw new Error(`Failed to download ${s3Key} from S3: Empty response body`);
    }

    if (!(response.Body instanceof Readable)) {
      throw new Error(`Failed to download ${s3Key} from S3: Invalid response stream`);
    }

    // Pipeline giúp stream dữ liệu thẳng từ S3 vào file trên ổ cứng một cách an toàn
    await pipeline(response.Body, createWriteStream(destPath));
  }

  /**
   * Upload folder HLS lên S3 sau khi FFmpeg xử lý xong
   */
  async uploadHlsDirectory(localDir: string, keyPrefix: string): Promise<{ streamingUrl: string }> {
    const files = await readdir(localDir);
    for (let i = 0; i < files.length; i += this.hlsUploadConcurrency) {
      const chunk = files.slice(i, i + this.hlsUploadConcurrency);
      await Promise.all(
        chunk.map(async (fileName) => {
          const fullPath = path.join(localDir, fileName);
          const key = `${keyPrefix}/${fileName}`;

          const upload = new Upload({
            client: this.s3Client,
            params: {
              Bucket: this.defaultBucket,
              Key: key,
              Body: createReadStream(fullPath),
              ContentType: this.resolveContentType(fileName),
              CacheControl: fileName.endsWith('.m3u8') ? 'max-age=0, no-cache' : 'max-age=31536000',
            },
          });

          await upload.done();
        }),
      );
    }

    return {
      streamingUrl: `${this.publicUrlBase}/storage/v1/object/public/${this.defaultBucket}/${keyPrefix}/index.m3u8`,
    };
  }

  onModuleDestroy() {
    this.s3Client.destroy();
  }

  /**
   * Executes the get default bucket operation.
   *
   * @returns Result of type string
   */
  getDefaultBucket(): string {
    return this.defaultBucket;
  }

  /**
   * Executes the get public object url operation.
   *
   * @param s3Key - The s3Key parameter
   * @returns Result of type string
   */
  getPublicObjectUrl(s3Key: string): string {
    return `${this.publicUrlBase}/storage/v1/object/public/${this.defaultBucket}/${s3Key}`;
  }

  /**
   * Executes the generate presigned download url operation.
   *
   * @param s3Key - The s3Key parameter
   * @returns Result of type Promise<string>
   */
  async generatePresignedDownloadUrl(s3Key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.defaultBucket,
      Key: s3Key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: this.presignedUrlExpirationSeconds,
    });
  }

  /**
   * Check if an object exists in S3 using HeadObject.
   * Returns true if the object exists, false otherwise.
   */
  async headObject(s3Key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.defaultBucket,
          Key: s3Key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Download a file from S3 and return its content as a Buffer.
   * Used for preview processing where the file needs to be in memory.
   */
  async getObjectBuffer(s3Key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.defaultBucket,
      Key: s3Key,
    });

    const response = await this.s3Client.send(command);

    if (!response.Body) {
      throw new Error(`Failed to get object ${s3Key}: Empty response body`);
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  /**
   * Upload a Buffer directly to S3.
   * Used for storing generated preview files.
   */
  async uploadBuffer(s3Key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.defaultBucket,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  /**
   * Generate a short-lived presigned URL for preview display.
   * Uses ResponseContentDisposition: 'inline' so the browser renders
   * the file in-page rather than triggering a download dialog.
   * TTL: 60 seconds (previews are transient, re-requestable).
   */
  async generatePreviewSignedUrl(s3Key: string, contentType?: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.defaultBucket,
      Key: s3Key,
      ResponseContentDisposition: 'inline',
      ...(contentType ? { ResponseContentType: contentType } : {}),
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 60 });
  }

  /**
   * Generate the S3 key for a preview file based on the original key.
   * Convention: previews/30pct/{original-key}
   */
  getPreviewKey(originalKey: string): string {
    return `previews/30pct/${originalKey}`;
  }

  /**
   * Executes the extract file extension operation.
   *
   * @param fileName - The fileName parameter
   * @returns Result of type string
   */
  private extractFileExtension(fileName?: string): string {
    if (!fileName) return '';
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex === -1 ? '' : fileName.substring(lastDotIndex);
  }

  /**
   * Executes the resolve mime type operation.
   *
   * @param fileName - The fileName parameter
   * @returns Result of type string
   */
  private resolveMimeType(fileName?: string): string {
    if (!fileName) return 'application/octet-stream';

    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.zip': 'application/zip',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
    };

    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Executes the resolve content type operation.
   *
   * @param fileName - The fileName parameter
   * @returns Result of type string
   */
  private resolveContentType(fileName?: string): string {
    if (!fileName) return 'application/octet-stream';
    if (fileName.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
    if (fileName.endsWith('.ts')) return 'video/mp2t';
    return 'application/octet-stream';
  }
}
