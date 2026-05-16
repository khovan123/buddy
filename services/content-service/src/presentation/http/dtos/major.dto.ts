import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MajorStatus } from '../../../domain/entities/major.entity';

/** Data Transfer Object for  create major. */
export class CreateMajorDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsEnum(MajorStatus)
  status?: MajorStatus;
}

/** Data Transfer Object for  update major. */
export class UpdateMajorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsEnum(MajorStatus)
  status?: MajorStatus;
}
