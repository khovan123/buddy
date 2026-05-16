import { UpdateCourseDto } from '../../presentation/http/dtos/course.dto';

export class UpdateCourseCommand {
  constructor(
    public readonly id: string,
    public readonly dto: UpdateCourseDto,
  ) {}
}
