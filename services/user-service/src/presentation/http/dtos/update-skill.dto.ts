import { Transform } from 'class-transformer';
import { IsEnum, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
import { HighlightSkillStatus } from '../../../domain/entities/highlight-skill.entity';

/** Data Transfer Object for  update skill. */
export class UpdateSkillDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsMongoId()
  careerId?: string;

  @IsOptional()
  @IsEnum(HighlightSkillStatus)
  status?: HighlightSkillStatus;
}
