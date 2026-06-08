import type { InteractionEntity } from '../entities/interaction.entity';
import type { InteractionContentType, InteractionStatsPayload } from '@libs/contracts';

/** Domain repository interface — infrastructure layer implements this. */
export interface IInteractionRepository {
  create(entity: InteractionEntity): Promise<void>;
  getStatsForItem(params: {
    itemId: string;
    itemType: InteractionContentType;
    userId?: string;
  }): Promise<InteractionStatsPayload>;
  getStatsForItems(params: {
    items: Array<{ itemId: string; itemType: InteractionContentType }>;
    userId?: string;
  }): Promise<InteractionStatsPayload[]>;
}
