import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Data Transfer Object for  pagination. */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

/** Interface representing data constraints for  paginated result. */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function paginate<T>(data: T[], total: number, dto: PaginationDto): PaginatedResult<T> {
  const totalPages = Math.ceil(total / dto.limit);
  return {
    data,
    meta: {
      total,
      page: dto.page,
      limit: dto.limit,
      totalPages,
      hasNextPage: dto.page < totalPages,
      hasPrevPage: dto.page > 1,
    },
  };
}
