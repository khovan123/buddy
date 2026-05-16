import { Global, Module } from '@nestjs/common';
import { S3Service } from './s3.service';

/**
 * S3Module - Centralized AWS S3 infrastructure configuration.
 *
 * Exports:
 * - S3Service: AWS S3 implementation (IStorageProvider)
 * - STORAGE_PROVIDER token: inject bằng Symbol token ở tầng Application
 *
 * Architecture:
 * - STORAGE_PROVIDER được inject vào tầng Application qua Symbol token
 * - S3Service implement IStorageProvider để phục vụ presigned URL workflow
 * - Tầng Domain không import AWS SDK trực tiếp
 */
@Global()
@Module({
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}
