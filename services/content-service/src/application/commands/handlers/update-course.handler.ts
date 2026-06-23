import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ICourseRepository } from '../../../domain/repositories/course.repository.interface';
import { COURSE_REPOSITORY } from '../../../domain/repositories/tokens';
import { RecommendationSyncPublisher } from '../../../infrastructure/messaging/publishers/recommendation-sync.publisher';
import { UpdateCourseCommand } from '../update-course.command';

@CommandHandler(UpdateCourseCommand)
export class UpdateCourseHandler implements ICommandHandler<UpdateCourseCommand> {
  constructor(
    @Inject(COURSE_REPOSITORY)
    private readonly courseRepository: ICourseRepository,
    private readonly recommendationSync: RecommendationSyncPublisher,
  ) {}

  async execute(command: UpdateCourseCommand) {
    const result = await this.courseRepository.update(command.id, command.dto);

    if (result) {
      // Sync to recommendation-service (fire-and-forget)
      this.recommendationSync.send({
        type: 'COURSE_UPSERT',
        courseId: command.id,
        majorId: result.majorIds && result.majorIds.length > 0 ? result.majorIds[0] : '',
        semester: result.semester,
        code: result.code,
        name: result.name,
      });
    }

    return result;
  }
}
