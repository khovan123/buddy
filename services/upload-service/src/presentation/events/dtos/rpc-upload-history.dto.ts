import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BaseRpcEnvelopeDto } from './rpc-presigned-url.dto';

// ─── Upload History by Content (upload.get_upload_history_by_content) ─────

/** Payload for fetching upload history of a single content item. */
export class GetUploadHistoryByContentPayloadDto {
  @IsString()
  @IsNotEmpty()
  contentId!: string;
}

/** RPC envelope for `upload.get_upload_history_by_content`. */
export class GetUploadHistoryByContentRpcDto extends BaseRpcEnvelopeDto {
  @ValidateNested()
  @Type(() => GetUploadHistoryByContentPayloadDto)
  payload!: GetUploadHistoryByContentPayloadDto;
}

// ─── Re-extract Content (upload.content.reextract) ─────────────────

/** Payload for re-extracting content files from object storage. */
export class ReextractContentPayloadDto {
  @IsString()
  @IsNotEmpty()
  contentId!: string;

  @IsString()
  @IsOptional()
  contentType?: string;
}

/** RPC envelope for `upload.content.reextract`. */
export class ReextractContentRpcDto extends BaseRpcEnvelopeDto {
  @ValidateNested()
  @Type(() => ReextractContentPayloadDto)
  payload!: ReextractContentPayloadDto;
}

// ─── Batch Upload History by Content (upload.get_batch_upload_history_by_content) ─

/** Payload for fetching upload history of multiple content items. */
export class GetBatchUploadHistoryByContentPayloadDto {
  @IsArray()
  @IsString({ each: true })
  contentIds!: string[];
}

/** RPC envelope for `upload.get_batch_upload_history_by_content`. */
export class GetBatchUploadHistoryByContentRpcDto extends BaseRpcEnvelopeDto {
  @ValidateNested()
  @Type(() => GetBatchUploadHistoryByContentPayloadDto)
  payload!: GetBatchUploadHistoryByContentPayloadDto;
}

// ─── Resource Upload History by User (upload.get_resource_upload_history_by_user) ──────────

/** Payload for fetching resource upload history by user. */
export class GetResourceUploadHistoryByUserPayloadDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  limit?: number;
}

/** RPC envelope for `upload.get_resource_upload_history_by_user`. */
export class GetResourceUploadHistoryByUserRpcDto extends BaseRpcEnvelopeDto {
  @ValidateNested()
  @Type(() => GetResourceUploadHistoryByUserPayloadDto)
  payload!: GetResourceUploadHistoryByUserPayloadDto;
}

// ─── Tutorial Upload History by User (upload.get_tutorial_upload_history_by_user) ──────────

/** Payload for fetching tutorial upload history by user. */
export class GetTutorialUploadHistoryByUserPayloadDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  limit?: number;
}

/** RPC envelope for `upload.get_tutorial_upload_history_by_user`. */
export class GetTutorialUploadHistoryByUserRpcDto extends BaseRpcEnvelopeDto {
  @ValidateNested()
  @Type(() => GetTutorialUploadHistoryByUserPayloadDto)
  payload!: GetTutorialUploadHistoryByUserPayloadDto;
}
