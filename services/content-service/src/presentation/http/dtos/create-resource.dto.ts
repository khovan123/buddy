import { Transform, Type } from 'class-transformer';
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
  MinLength,
  ValidateNested,
} from 'class-validator';

const RESOURCE_ALLOWED_FILE_TYPES_MESSAGE = 'Resource files must be .txt, .docx, .md, or .pdf';
const RESOURCE_ALLOWED_FILE_NAME_PATTERN = /\.(txt|docx|md|pdf)$/i;

/** Data Transfer Object for  create resource file. */
export class CreateResourceFileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  @Matches(RESOURCE_ALLOWED_FILE_NAME_PATTERN, {
    message: RESOURCE_ALLOWED_FILE_TYPES_MESSAGE,
  })
  @Transform(({ value }) => value?.trim())
  fileName!: string;

  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  @Transform(({ value }) => Number.parseFloat(value?.toString()))
  fileSizeBytes!: number;

  @IsString()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  mimeType!: string;
}

/**
 * CreateResourceDto - DTO để tạo Resource (tài liệu/file đính kèm).
 *
 * Workflow:
 * 1. Client gọi POST /resources với DTO này (fileName, fileSizeBytes, ...)
 * 2. Backend validate majorId/courseId
 * 3. Backend tạo Resource metadata với status PENDING
 * 4. Backend gọi upload-service để lấy presigned URL
 * 5. Return presigned URL cho client upload trực tiếp lên S3
 * 6. Upload service phát `file.processed` event
 * 7. Content service consume và cập nhật resource với downloadUrl
 */
export class CreateResourceDto {
  /**
   * User ID người tạo resource
   */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toLowerCase().trim())
  userId?: string;

  /**
   * Tiêu đề resource (ví dụ: "Lecture Notes", "Assignment PDF")
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  title!: string;

  /**
   * Mô tả ngắn về resource
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(256)
  @Transform(({ value }) => value?.trim())
  summary!: string;

  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  @MinLength(10, { each: true })
  @MaxLength(256, { each: true })
  @Transform(({ value }) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  })
  hightlights!: string[];

  @IsMongoId()
  @IsNotEmpty()
  majorId!: string;

  @IsMongoId()
  @IsNotEmpty()
  courseId!: string;

  /**
   * Giá resource (tính tiền)
   */
  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => Number.parseFloat(value?.toString()?.trim()))
  price!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateResourceFileDto)
  files!: CreateResourceFileDto[];

  /**
   * (Optional) Base64 encoded image for thumbnail upload
   */
  @IsOptional()
  @IsString()
  thumbnailBase64?: string;

  /**
   * (Optional) Collection ID nếu resource thuộc collection
   */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  collectionId?: string;
}
