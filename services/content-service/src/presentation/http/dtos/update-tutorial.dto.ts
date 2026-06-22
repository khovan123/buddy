import { Transform, Type } from 'class-transformer';
import {
  IsArray,
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
import { TutorialStepDto } from './create-tutorial.dto';

export class UpdateTutorialDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(50)
  @MaxLength(500)
  @Transform(({ value }) => value?.trim())
  description!: string;

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
  @Transform(({ value }) => Number.parseFloat(String(value ?? '').trim()))
  price!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => Number.parseFloat(String(value ?? '').trim()))
  discountBundle!: number;

  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase().trim() || undefined)
  collectionId?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TutorialStepDto)
  steps?: TutorialStepDto[];
}
