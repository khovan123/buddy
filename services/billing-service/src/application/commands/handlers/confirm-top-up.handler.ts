import { WalletToppedUpEvent } from '@libs/contracts';
import { Inject, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { WALLET_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IWalletRepository } from '../../../domain/repositories/wallet.repository.interface';
import { PaymentGatewayFactory } from '../../../infrastructure/external/payment/payment.factory';
import { ConfirmTopUpCommand } from '../confirm-top-up.command';

/** CQRS Handler to execute  confirm top up. */
@CommandHandler(ConfirmTopUpCommand)
export class ConfirmTopUpHandler implements ICommandHandler<ConfirmTopUpCommand> {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   * @returns Result of type Promise<{ transactionId: string; userId: string }>
   */
  async execute(command: ConfirmTopUpCommand): Promise<{ transactionId: string; userId: string }> {
    const gateway = this.paymentGatewayFactory.getGateway(command.provider);

    const verification = await gateway.verifyWebhook({
      signature: command.signature,
      rawBody: command.rawBody,
      headers: command.headers,
    });

    if (!verification.success) {
      throw new UnauthorizedException('Webhook signature verification failed');
    }

    const event = new WalletToppedUpEvent(
      {
        transactionId: '',
        userId: '',
        walletId: '',
        amount: verification.amountInCents.toString(),
        provider: command.provider,
        toppedUpAt: new Date().toISOString(),
      },
      command.correlationId,
    );

    const topUpResult = await this.walletRepository.confirmTopUpAndInsertOutbox({
      externalReference: verification.externalReference,
      provider: command.provider,
      amountInCents: verification.amountInCents,
      occurredAt: this.getWebhookOccurredAt(verification.metadata),
      eventType: event.routingKey,
      eventPayload: {
        eventId: event.eventId,
        routingKey: event.routingKey,
        version: event.version,
        occurredAt: event.occurredAt,
        correlationId: event.correlationId,
        causationId: event.causationId,
        payload: event.payload,
      },
      correlationId: command.correlationId,
    });

    return { transactionId: topUpResult.transactionId, userId: topUpResult.userId };
  }

  private getWebhookOccurredAt(metadata?: Record<string, unknown>): Date | undefined {
    const candidates = [
      metadata?.transactionDate,
      metadata?.transaction_date,
      typeof metadata?.transaction === 'object' && metadata.transaction !== null
        ? (metadata.transaction as Record<string, unknown>).transaction_date
        : undefined,
      metadata?.timestamp,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'number') {
        const date = new Date(candidate * 1000);
        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }

      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        const date = new Date(candidate);
        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return undefined;
  }
}
