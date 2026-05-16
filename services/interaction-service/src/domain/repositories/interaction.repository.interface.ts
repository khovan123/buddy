import type { InteractionEntity } from '../entities/interaction.entity';

/** Domain repository interface — infrastructure layer implements this. */
export interface IInteractionRepository {
  create(entity: InteractionEntity): Promise<void>;
}
