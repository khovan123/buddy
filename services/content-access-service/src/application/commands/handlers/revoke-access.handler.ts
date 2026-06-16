import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { IContentAccessRepository } from '../../../domain/repositories/content-access.repository.interfaces';
import { CONTENT_ACCESS_REPOSITORY } from '../../../domain/repositories/tokens';
import { RevokeAccessCommand } from '../revoke-access.command';

@CommandHandler(RevokeAccessCommand)
@Injectable()
export class RevokeAccessHandler implements ICommandHandler<RevokeAccessCommand> {
  private readonly logger = new Logger(RevokeAccessHandler.name);

  constructor(
    @Inject(CONTENT_ACCESS_REPOSITORY)
    private readonly contentAccessRepository: IContentAccessRepository,
  ) {}

  async execute(command: RevokeAccessCommand): Promise<void> {
    const count = await this.contentAccessRepository.revokeByPurchase(
      command.userId,
      command.purchaseId,
    );

    this.logger.log(
      `Revoked ${count} access records for purchase ${command.purchaseId} of user ${command.userId}`,
    );
  }
}
