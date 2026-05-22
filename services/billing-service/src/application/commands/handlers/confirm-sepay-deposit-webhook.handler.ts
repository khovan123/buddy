import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfirmSePayDepositWebhookCommand } from '../confirm-sepay-deposit-webhook.command';
import { ConfirmTopUpCommand } from '../confirm-top-up.command';

@CommandHandler(ConfirmSePayDepositWebhookCommand)
export class ConfirmSePayDepositWebhookHandler
  implements ICommandHandler<ConfirmSePayDepositWebhookCommand>
{
  constructor(private readonly commandBus: CommandBus) {}

  async execute(
    command: ConfirmSePayDepositWebhookCommand,
  ): Promise<{ transactionId: string; userId: string }> {
    return this.commandBus.execute(
      new ConfirmTopUpCommand(
        'SEPAY',
        command.rawBody,
        command.signature,
        command.headers,
        command.correlationId,
      ),
    );
  }
}
