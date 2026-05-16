import { PaginationDto } from '@libs/contracts';
import { IsOptional, IsString, Length } from 'class-validator';

export class GetSkillsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Length(24, 24)
  careerId?: string;
}
