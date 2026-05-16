import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetUncollectedResourcesQueryDto {
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @IsOptional()
  @Transform(({ value }) => {
    const parsed = Number.parseInt(value);
    return isNaN(parsed) || parsed <= 0 ? 100 : parsed > 100 ? 100 : parsed;
  })
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 100;
}
