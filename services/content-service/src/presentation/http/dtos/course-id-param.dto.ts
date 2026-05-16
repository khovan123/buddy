import { IsNotEmpty, IsString } from 'class-validator';

export class CourseIdParamDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}
