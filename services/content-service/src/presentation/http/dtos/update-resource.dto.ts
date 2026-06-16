import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LearningFitDto } from './learning-fit.dto';

export class UpdateResourceDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(256)
  @Transform(({ value }) => value?.trim())
  summary!: string;

  @IsArray()
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
  @Transform(({ value }) => Number.parseFloat(value?.toString()?.trim()))
  price!: number;

  @IsOptional()
  @IsString()
  thumbnailBase64?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim() || undefined)
  collectionId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LearningFitDto)
  learningFit?: LearningFitDto;
}
