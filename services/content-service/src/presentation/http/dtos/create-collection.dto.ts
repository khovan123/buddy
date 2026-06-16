import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CollectionPhaseItemType,
  CollectionType,
} from '../../../infrastructure/persistence/mongo/schemas/collection.schema';
import { LearningFitDto } from './learning-fit.dto';

/** DTO for a single item inside a Collection Phase. */
export class CollectionPhaseItemDto {
  @IsMongoId()
  @IsNotEmpty()
  itemId!: string;

  @IsEnum(CollectionPhaseItemType)
  @IsNotEmpty()
  itemType!: CollectionPhaseItemType;
}

/** DTO for a Collection Phase (roadmap stage). */
export class CollectionPhaseDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  phaseTitle!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  learningGoal?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollectionPhaseItemDto)
  items!: CollectionPhaseItemDto[];
}

/**
 * CreateCollectionDto - DTO để tạo Collection (bộ sưu tập Resource hoặc Tutorial).
 *
 * Workflow:
 * 1. Client gọi POST /collections với DTO này
 * 2. Backend validate majorId/courseId/resourceIds integrity
 * 3. Backend generate slug từ title
 * 4. Tạo Collection entity và save vào DB
 */
export class CreateCollectionDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toLowerCase().trim())
  userId?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  description!: string;

  @IsArray()
  @IsNotEmpty()
  @Transform(({ value }) => (Array.isArray(value) ? value : [...value]))
  hightlights!: string[];

  @IsMongoId()
  @IsNotEmpty()
  majorId!: string;

  @IsMongoId()
  @IsNotEmpty()
  courseId!: string;

  @IsArray()
  @IsOptional()
  @IsMongoId({ each: true })
  resourceIds?: string[];

  @IsArray()
  @IsOptional()
  @IsMongoId({ each: true })
  tutorialIds?: string[];

  /**
   * (Optional) Base64 encoded image for thumbnail upload
   */
  @IsOptional()
  @IsString()
  thumbnailBase64?: string;

  @IsEnum(CollectionType)
  @IsNotEmpty()
  type!: CollectionType;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => Number.parseFloat(value?.toString()))
  discount!: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CollectionPhaseDto)
  phases?: CollectionPhaseDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => LearningFitDto)
  learningFit?: LearningFitDto;
}
