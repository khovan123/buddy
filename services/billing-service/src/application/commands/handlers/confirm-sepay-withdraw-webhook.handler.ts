import { BadRequestException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SePayAdapter } from '../../../infrastructure/external/payment/sepay.adapter';
import { ConfirmSePayWithdrawWebhookCommand } from '../confirm-sepay-withdraw-webhook.command';
import { ConfirmWithdrawCommand } from '../confirm-withdraw.command';

type SePayWithdrawWebhookPayload = {
  transferType?: string;
  code?: string | null;
  content?: string | null;
  description?: string | null;
  referenceCode?: string | null;
};

@CommandHandler(ConfirmSePayWithdrawWebhookCommand)
export class ConfirmSePayWithdrawWebhookHandler
  implements ICommandHandler<ConfirmSePayWithdrawWebhookCommand>
{
  constructor(
    private readonly commandBus: CommandBus,
    private readonly sepay: SePayAdapter,
  ) {}

  async execute(
    command: ConfirmSePayWithdrawWebhookCommand,
  ): Promise<{ transactionId: string; userId: string }> {
    this.sepay.verifyWebhookRequest({
      rawBody: command.rawBody,
      signature: command.signature,
      headers: command.headers,
    });

    const payload = this.parsePayload(command.rawBody);
    if (payload.transferType !== 'out') {
      throw new BadRequestException('Use SEPAY deposit webhook endpoint for inbound webhook');
    }

    const transactionId = this.extractWithdrawTransactionId(payload);
    return this.commandBus.execute(
      new ConfirmWithdrawCommand(transactionId, command.correlationId),
    );
  }

  private parsePayload(rawBody: string): SePayWithdrawWebhookPayload {
    try {
      const payload: unknown = JSON.parse(rawBody);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('payload is not an object');
      }

      return payload as SePayWithdrawWebhookPayload;
    } catch {
      throw new BadRequestException('Invalid SEPAY withdraw webhook payload');
    }
  }

  private extractWithdrawTransactionId(payload: SePayWithdrawWebhookPayload): string {
    const text = [payload.code, payload.content, payload.description, payload.referenceCode]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' ');

    const prefixedMatch = text.match(
      /\b(?:WDR|SEPAY-MANUAL)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i,
    );
    if (prefixedMatch?.[1]) {
      return prefixedMatch[1];
    }

    const uuidMatch = text.match(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
    );
    if (uuidMatch?.[0]) {
      return uuidMatch[0];
    }

    throw new BadRequestException('SEPAY withdraw webhook: missing withdraw transaction reference');
  }
}
