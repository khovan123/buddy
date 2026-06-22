import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const TUTORIAL_ALLOWED_FILE_TYPES_MESSAGE = 'Tutorial videos must be .mp4 files';
const TUTORIAL_ALLOWED_FILE_NAME_PATTERN = /\.mp4$/i;

export class TutorialStepResourceDto {
  @IsMongoId()
  @IsNotEmpty()
  resourceId!: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim() ?? '')
  instructionNote?: string;
}

export class TutorialStepDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  title!: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TutorialStepResourceDto)
  resources!: TutorialStepResourceDto[];
}

/**
 * CreateTutorialDto - DTO để tạo Tutorial (video-based course).
 *
 * Workflow (New - Presigned URL):
 * 1. Client gọi POST /tutorials với DTO này (fileName, fileSizeBytes, videoDurationSeconds, ...)
 * 2. Backend validate majorId/courseId/resourceIds/collectionIds integrity
 * 3. Backend tạo Tutorial metadata với status PROCESSING
 * 4. Backend gọi upload-service để lấy presigned URL
 * 5. Return presigned URL cho client upload trực tiếp lên S3
 * 6. Upload service xử lý video (HLS transcode, trailer cut)
 * 7. Upload service phát `file.processed` event
 * 8. Content service consume và cập nhật tutorial với streamingUrl, trailerUrl
 */
export class CreateTutorialDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toLowerCase().trim())
  userId?: string;

  @Transform(({ value }) => value?.toLowerCase().trim() ?? undefined)
  collectionId?: string;

  @IsArray()
  @IsOptional()
  @IsMongoId({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((item: string) => item?.trim()) : undefined,
  )
  resourceIds?: string[];

  @IsArray()
  @IsOptional()
  @IsMongoId({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((item: string) => item?.trim()) : undefined,
  )
  collectionIds?: string[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TutorialStepDto)
  steps?: TutorialStepDto[];

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(50)
  @MaxLength(500)
  description!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MinLength(10, { each: true })
  @MaxLength(256, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  hightlights!: string[];

  @IsMongoId()
  @IsNotEmpty()
  majorId!: string;

  @IsMongoId()
  @IsNotEmpty()
  courseId!: string;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number.parseFloat(String(value ?? '').trim()))
  price!: number;

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => Number.parseFloat(String(value ?? '').trim()))
  discountBundle!: number;

  /**
   * Tên file gốc (ví dụ: "lecture-video.mp4")
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  @Matches(TUTORIAL_ALLOWED_FILE_NAME_PATTERN, {
    message: TUTORIAL_ALLOWED_FILE_TYPES_MESSAGE,
  })
  fileName!: string;

  /**
   * Kích thước file tính bằng bytes
   */
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  fileSizeBytes!: number;

  /**
   * Độ dài video tính bằng giây (dùng để tính ETA)
   */
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  videoDurationSeconds!: number;

  /**
   * (Deprecated - kept for backward compatibility)
   * Original filename
   */
  @IsOptional()
  @IsString()
  originalFilename?: string;

  /**
   * (Deprecated - kept for backward compatibility)
   * MIME type
   */
  @IsOptional()
  @IsString()
  mimeType?: string;
}
