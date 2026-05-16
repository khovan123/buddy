import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ICourseRepository } from '../../../domain/repositories/course.repository.interface';
import type { IMajorRepository } from '../../../domain/repositories/major.repository.interface';
import { COURSE_REPOSITORY, MAJOR_REPOSITORY } from '../../../domain/repositories/tokens';
import { UserServicePublisher } from '../../../infrastructure/messaging/publishers/user-service.rpc';
import { GetContentMetaQuery } from '../get-content-meta.query';

@QueryHandler(GetContentMetaQuery)
export class GetContentMetaHandler implements IQueryHandler<GetContentMetaQuery> {
  constructor(
    @Inject(MAJOR_REPOSITORY) private readonly majorRepository: IMajorRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepository: ICourseRepository,

    private readonly userServicePublisher: UserServicePublisher,
  ) {}

  async execute() {
    const [majors, courses] = await Promise.all([
      this.majorRepository.findAll(),
      this.courseRepository.findAll(),
    ]);

    return { majors, courses };
  }
}
