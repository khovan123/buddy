import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { IContentAccessRepository } from '../../../domain/repositories/content-access.repository.interfaces';
import { CONTENT_ACCESS_REPOSITORY } from '../../../domain/repositories/tokens';
import { GrantAccessCommand } from '../grant-access.command';

/** CQRS Handler to execute  grant access. */
@CommandHandler(GrantAccessCommand)
@Injectable()
export class GrantAccessHandler implements ICommandHandler<GrantAccessCommand> {
  private readonly logger = new Logger(GrantAccessHandler.name);

  constructor(
    @Inject(CONTENT_ACCESS_REPOSITORY)
    private readonly contentAccessRepository: IContentAccessRepository,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   * @returns Result of type Promise<{ grantedCount: number }>
   */
  async execute(command: GrantAccessCommand): Promise<{ grantedCount: number }> {
    const result = await this.contentAccessRepository.grantForPurchase({
      purchaseId: command.purchaseId,
      userId: command.userId,
      purchasedItems: command.purchasedItems,
    });

    this.logger.log(
      `Granted access for purchase ${command.purchaseId} to user ${command.userId} (${result.grantedCount} records)`,
    );

    return result;
  }
}
