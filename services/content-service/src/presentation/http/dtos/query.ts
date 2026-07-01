import { Transform } from 'class-transformer';
import {
  IsInt,
  IsIn,
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Data Transfer Object for  query. */
export class QueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : undefined))
  userId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = Number.parseInt(value);
    return isNaN(parsed) || parsed <= 0 ? 1 : parsed;
  })
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = Number.parseInt(value);
    if (isNaN(parsed) || parsed <= 0) return 20;
    return parsed > 100 ? 100 : parsed;
  })
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = Number.parseInt(value);
    return isNaN(parsed) || parsed < 1 || parsed > 6 ? undefined : parsed;
  })
  @IsInt()
  @Min(1)
  @Max(6)
  semester?: number;

  @IsOptional()
  @IsMongoId()
  majorId?: string;

  @IsOptional()
  @IsMongoId()
  courseId?: string;

  @IsOptional()
  @IsIn(['free', 'paid'])
  price?: 'free' | 'paid';

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsIn(['newest', 'popular', 'rating'])
  sort?: 'newest' | 'popular' | 'rating';
}
