import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ICourseRepository } from '../../../domain/repositories/course.repository.interface';
import { COURSE_REPOSITORY } from '../../../domain/repositories/tokens';
import { RecommendationSyncPublisher } from '../../../infrastructure/messaging/publishers/recommendation-sync.publisher';
import { DeleteCourseCommand } from '../delete-course.command';

@CommandHandler(DeleteCourseCommand)
export class DeleteCourseHandler implements ICommandHandler<DeleteCourseCommand> {
  constructor(
    @Inject(COURSE_REPOSITORY)
    private readonly courseRepository: ICourseRepository,
    private readonly recommendationSync: RecommendationSyncPublisher,
  ) {}

  async execute(command: DeleteCourseCommand) {
    const result = await this.courseRepository.delete(command.id);

    // Sync deletion to recommendation-service (fire-and-forget)
    this.recommendationSync.send({
      type: 'COURSE_DELETED',
      courseId: command.id,
    });

    return result;
  }
}
