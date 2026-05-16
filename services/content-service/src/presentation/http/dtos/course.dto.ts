import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CourseStatus } from '../../../domain/entities/course.entity';

/** Data Transfer Object for  create course. */
export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  credits!: number;

  @IsInt()
  @Min(1)
  semester!: number;

  @IsBoolean()
  @IsOptional()
  isCompulsory?: boolean;

  @IsString()
  @IsNotEmpty()
  majorId!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  prerequisiteCourseIds?: string[];

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}

/** Data Transfer Object for  update course. */
export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  credits?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  semester?: number;

  @IsOptional()
  @IsBoolean()
  isCompulsory?: boolean;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  majorId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisiteCourseIds?: string[];

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;
}
