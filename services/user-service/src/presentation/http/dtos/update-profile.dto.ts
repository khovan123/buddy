import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/** Data Transfer Object for  update profile. */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  nickname?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsDate()
  dateOfBirth?: Date;

  @IsOptional()
  @IsMongoId()
  majorId?: string;

  @IsOptional()
  @IsMongoId()
  courseId?: string;

  @IsOptional()
  @IsNumber()
  semester?: number;

  @IsOptional()
  @IsMongoId()
  careerId?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  skillIds?: string[];
}
