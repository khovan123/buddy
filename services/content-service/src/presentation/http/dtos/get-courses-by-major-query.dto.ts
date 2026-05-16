import { IsNotEmpty, IsString } from 'class-validator';

export class GetCoursesByMajorQueryDto {
  @IsString()
  @IsNotEmpty()
  majorId!: string;
}
