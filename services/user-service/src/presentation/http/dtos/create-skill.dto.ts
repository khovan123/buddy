import { Transform } from 'class-transformer';
import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { HighlightSkillStatus } from '../../../domain/entities/highlight-skill.entity';

/** Data Transfer Object for  create skill. */
export class CreateSkillDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  name!: string;

  @IsMongoId()
  careerId!: string;

  @IsOptional()
  @IsEnum(HighlightSkillStatus)
  status?: HighlightSkillStatus;
}
