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

export class GetTopTutorialsQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    const parsed = Number.parseInt(value);
    return isNaN(parsed) || parsed <= 0 ? 6 : parsed > 20 ? 20 : parsed;
  })
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 6;

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
