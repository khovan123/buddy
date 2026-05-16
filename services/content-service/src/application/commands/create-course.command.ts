import { CreateCourseDto } from '../../presentation/http/dtos/course.dto';

export class CreateCourseCommand {
  constructor(public readonly dto: CreateCourseDto) {}
}
