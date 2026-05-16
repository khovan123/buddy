import { ContentType, UploadType } from '@libs/contracts';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// ─── Base RPC Envelope ───────────────────────────────────────
// Mirrors the message shape produced by StorageBrokerPublisher.toMessageData()
// + attachTraceContextToMessage(). Envelope fields are optional since
// only the payload carries business-critical data.

/** Base DTO for all inbound RPC messages from the content-service. */
export class BaseRpcEnvelopeDto {
  @IsString()
  @IsOptional()
  eventId?: string;

  @IsString()
  @IsOptional()
  routingKey?: string;

  @IsNumber()
  @IsOptional()
  version?: number;

  @IsOptional()
  occurredAt?: Date;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsString()
  @IsOptional()
  causationId?: string;

  @IsOptional()
  headers?: Record<string, string>;
}

/** File metadata inside a batch presigned URL request. */
export class FileMetadataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  @Transform(({ value }) => value?.trim())
  fileName!: string;

  @IsNumber()
  @IsPositive()
  fileSizeBytes!: number;

  @IsString()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  mimeType!: string;
}

// ─── Single Presigned URL (upload.get_presigned_url) ─────────

/** Payload shape for a single presigned URL request. */
export class GetPresignedUrlPayloadDto {
  @Type(() => FileMetadataDto)
  file!: FileMetadataDto;

  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(UploadType))
  uploadType!: UploadType;

  @IsString()
  @IsNotEmpty()
  uploadedBy!: string;

  @IsString()
  @IsNotEmpty()
  contentId!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(ContentType))
  contentType!: ContentType;
}

/** Envelope DTO for `upload.get_presigned_url` RPC pattern. */
export class GetPresignedUrlRpcDto extends BaseRpcEnvelopeDto {
  @ValidateNested()
  @Type(() => GetPresignedUrlPayloadDto)
  payload!: GetPresignedUrlPayloadDto;
}

// ─── Batch Presigned URLs (upload.get_presigned_urls) ────────

/** Payload shape for a batch presigned URLs request. */
export class GetPresignedUrlsPayloadDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FileMetadataDto)
  files!: FileMetadataDto[];

  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(UploadType))
  uploadType!: UploadType;

  @IsString()
  @IsNotEmpty()
  uploadedBy!: string;

  @IsString()
  @IsNotEmpty()
  contentId!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(ContentType))
  contentType!: ContentType;
}

/** Envelope DTO for `upload.get_presigned_urls` RPC pattern. */
export class GetPresignedUrlsRpcDto extends BaseRpcEnvelopeDto {
  @ValidateNested()
  @Type(() => GetPresignedUrlsPayloadDto)
  payload!: GetPresignedUrlsPayloadDto;
}
