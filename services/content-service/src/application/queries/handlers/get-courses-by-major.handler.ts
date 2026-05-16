import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { COURSE_REPOSITORY } from '../../../domain/repositories/tokens';
import type { ICourseRepository } from '../../../domain/repositories/course.repository.interface';
import { GetCoursesByMajorQuery } from '../get-courses-by-major.query';

@QueryHandler(GetCoursesByMajorQuery)
export class GetCoursesByMajorHandler implements IQueryHandler<GetCoursesByMajorQuery> {
  constructor(@Inject(COURSE_REPOSITORY) private readonly repo: ICourseRepository) {}

  async execute(query: GetCoursesByMajorQuery) {
    return this.repo.findByMajorId(query.majorId);
  }
}
