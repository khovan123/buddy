import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { RevokeAccessCommand } from '../revoke-access.command';

@CommandHandler(RevokeAccessCommand)
@Injectable()
export class RevokeAccessHandler implements ICommandHandler<RevokeAccessCommand> {
  private readonly logger = new Logger(RevokeAccessHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(command: RevokeAccessCommand): Promise<void> {
    const { count } = await this.prisma.client.userResourceAccess.updateMany({
      where: {
        userId: command.userId,
        purchaseId: command.purchaseId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.log(
      `Revoked ${count} access records for purchase ${command.purchaseId} of user ${command.userId}`,
    );
  }
}
