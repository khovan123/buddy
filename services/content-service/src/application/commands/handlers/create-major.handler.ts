import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { IMajorRepository } from '../../../domain/repositories/major.repository.interface';
import { MAJOR_REPOSITORY } from '../../../domain/repositories/tokens';
import { RecommendationSyncPublisher } from '../../../infrastructure/messaging/publishers/recommendation-sync.publisher';
import { CreateMajorCommand } from '../create-major.command';

@CommandHandler(CreateMajorCommand)
export class CreateMajorHandler implements ICommandHandler<CreateMajorCommand> {
  constructor(
    @Inject(MAJOR_REPOSITORY)
    private readonly majorRepository: IMajorRepository,
    private readonly recommendationSync: RecommendationSyncPublisher,
  ) {}

  async execute(command: CreateMajorCommand) {
    const result = await this.majorRepository.create(command.dto);

    // Sync to recommendation-service (fire-and-forget)
    this.recommendationSync.send({
      type: 'MAJOR_UPSERT',
      majorId: result.id,
      code: command.dto.code,
      name: command.dto.name,
    });

    return result;
  }
}
