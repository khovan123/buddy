import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CareerStatus } from '../../../domain/entities/career.entity';

/** Data Transfer Object for  create career. */
export class CreateCareerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  @Transform(({ value }) => value?.trim())
  description!: string;

  @IsOptional()
  @IsEnum(CareerStatus)
  status?: CareerStatus;
}
