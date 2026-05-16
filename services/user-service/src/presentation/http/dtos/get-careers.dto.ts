import { PaginationDto } from '@libs/contracts';
import { IsOptional, IsString } from 'class-validator';

export class GetCareersDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;
}
