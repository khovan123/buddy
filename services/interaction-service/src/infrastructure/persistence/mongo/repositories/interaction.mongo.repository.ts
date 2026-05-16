import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import type { InteractionEntity } from '../../../../domain/entities/interaction.entity';
import type { IInteractionRepository } from '../../../../domain/repositories/interaction.repository.interface';
import { Interaction, InteractionDocument } from '../schemas/interaction.schema';

@Injectable()
export class InteractionMongoRepository implements IInteractionRepository {
  constructor(@InjectModel(Interaction.name) private readonly model: Model<InteractionDocument>) {}

  async create(entity: InteractionEntity): Promise<void> {
    await this.model.create({
      userId: entity.userId,
      itemId: entity.itemId,
      itemType: entity.itemType,
      action: entity.action,
      weight: entity.weight,
      metadata: entity.metadata,
    });
  }
}
