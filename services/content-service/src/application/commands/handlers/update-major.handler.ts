import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { IMajorRepository } from '../../../domain/repositories/major.repository.interface';
import { MAJOR_REPOSITORY } from '../../../domain/repositories/tokens';
import { RecommendationSyncPublisher } from '../../../infrastructure/messaging/publishers/recommendation-sync.publisher';
import { UpdateMajorCommand } from '../update-major.command';

@CommandHandler(UpdateMajorCommand)
export class UpdateMajorHandler implements ICommandHandler<UpdateMajorCommand> {
  constructor(
    @Inject(MAJOR_REPOSITORY)
    private readonly majorRepository: IMajorRepository,
    private readonly recommendationSync: RecommendationSyncPublisher,
  ) {}

  async execute(command: UpdateMajorCommand) {
    const result = await this.majorRepository.update(command.id, command.dto);

    // Sync to recommendation-service (fire-and-forget)
    this.recommendationSync.send({
      type: 'MAJOR_UPSERT',
      majorId: command.id,
      code: command.dto.code,
      name: command.dto.name,
    });

    return result;
  }
}
