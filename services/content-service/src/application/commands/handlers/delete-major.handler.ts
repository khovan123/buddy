import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { IMajorRepository } from '../../../domain/repositories/major.repository.interface';
import { MAJOR_REPOSITORY } from '../../../domain/repositories/tokens';
import { RecommendationSyncPublisher } from '../../../infrastructure/messaging/publishers/recommendation-sync.publisher';
import { DeleteMajorCommand } from '../delete-major.command';

@CommandHandler(DeleteMajorCommand)
export class DeleteMajorHandler implements ICommandHandler<DeleteMajorCommand> {
  constructor(
    @Inject(MAJOR_REPOSITORY)
    private readonly majorRepository: IMajorRepository,
    private readonly recommendationSync: RecommendationSyncPublisher,
  ) {}

  async execute(command: DeleteMajorCommand) {
    const result = await this.majorRepository.delete(command.id);

    // Sync deletion to recommendation-service (fire-and-forget)
    this.recommendationSync.send({
      type: 'MAJOR_DELETED',
      majorId: command.id,
    });

    return result;
  }
}
