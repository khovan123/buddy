import { AppLogger } from '@libs/common';
import type { InteractionPayload } from '@libs/contracts';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { InteractionEntity } from '../../../domain/entities/interaction.entity';
import type { IInteractionRepository } from '../../../domain/repositories/interaction.repository.interface';
import { INTERACTION_REPOSITORY } from '../../../domain/repositories/tokens';
import { InteractionPublisher } from '../../../infrastructure/messaging/interaction.publisher';
import { TrackInteractionCommand } from '../track-interaction.command';

@CommandHandler(TrackInteractionCommand)
export class TrackInteractionHandler implements ICommandHandler<TrackInteractionCommand> {
  private readonly logger = new AppLogger(TrackInteractionHandler.name);

  constructor(
    @Inject(INTERACTION_REPOSITORY)
    private readonly repository: IInteractionRepository,
    private readonly publisher: InteractionPublisher,
  ) {}

  async execute(command: TrackInteractionCommand): Promise<void> {
    const entity = InteractionEntity.create({
      userId: command.userId,
      itemId: command.itemId,
      itemType: command.itemType,
      action: command.action,
      ratingValue: command.ratingValue,
      commentId: command.commentId,
      majorId: command.majorId,
      courseId: command.courseId,
      semester: command.semester,
    });

    // Persist to interaction_db (append-only)
    await this.repository.create(entity);

    // Publish to RabbitMQ (async, non-blocking)
    const payload: InteractionPayload = {
      userId: entity.userId,
      itemId: entity.itemId,
      itemType: entity.itemType,
      action: entity.action,
      weight: entity.weight,
      metadata: entity.metadata,
    };
    this.publisher.publish(payload);

    this.logger.debug(
      `Tracked ${entity.action} by ${entity.userId} on ${entity.itemType}:${entity.itemId} (w=${entity.weight})`,
    );
  }
}
