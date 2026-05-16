import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ICourseRepository } from '../../../domain/repositories/course.repository.interface';
import { COURSE_REPOSITORY } from '../../../domain/repositories/tokens';
import { RecommendationSyncPublisher } from '../../../infrastructure/messaging/publishers/recommendation-sync.publisher';
import { CreateCourseCommand } from '../create-course.command';

@CommandHandler(CreateCourseCommand)
export class CreateCourseHandler implements ICommandHandler<CreateCourseCommand> {
  constructor(
    @Inject(COURSE_REPOSITORY)
    private readonly courseRepository: ICourseRepository,
    private readonly recommendationSync: RecommendationSyncPublisher,
  ) {}

  async execute(command: CreateCourseCommand) {
    const result = await this.courseRepository.create(command.dto);

    // Sync to recommendation-service (fire-and-forget)
    this.recommendationSync.send({
      type: 'COURSE_UPSERT',
      courseId: result.id,
      majorId: command.dto.majorId,
      semester: command.dto.semester,
      code: command.dto.code,
      name: command.dto.name,
    });

    return result;
  }
}
