import { Transform } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class GetTopCollectionsQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    const parsed = Number.parseInt(value);
    return isNaN(parsed) || parsed <= 0 ? 3 : parsed > 20 ? 20 : parsed;
  })
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 3;

  @IsOptional()
  @IsString()
  type?: string;

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
}
