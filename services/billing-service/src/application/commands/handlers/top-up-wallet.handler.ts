import { Inject, ServiceUnavailableException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { WALLET_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IWalletRepository } from '../../../domain/repositories/wallet.repository.interface';
import { PaymentGatewayFactory } from '../../../infrastructure/external/payment/payment.factory';
import { TopUpWalletCommand } from '../top-up-wallet.command';

/** CQRS Handler to execute  top up wallet. */
@CommandHandler(TopUpWalletCommand)
export class TopUpWalletHandler implements ICommandHandler<TopUpWalletCommand> {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   * @returns Result of type Promise<{
   *     transactionId: string;
   *     checkoutUrl: string;
   *     externalReference: string;
   *   }>
   */
  async execute(command: TopUpWalletCommand): Promise<{
    transactionId: string;
    checkoutUrl: string;
    externalReference: string;
  }> {
    if (command.provider === 'PAYPAL') {
      throw new ServiceUnavailableException('PAYPAL GATEWAY IS NOT SUPPORTED SOON!');
    }
    const gateway = this.paymentGatewayFactory.getGateway(command.provider);

    const wallet = await this.walletRepository.getOrCreateWalletByUserId(command.userId);
    const orderCode = `${command.provider}-${Date.now()}`;

    const paymentLink = await gateway.createPaymentLink({
      amountInCents: command.amountInCents,
      orderCode,
      userId: command.userId,
      returnUrl: command.returnUrl,
      cancelUrl: command.cancelUrl,
      description: `Wallet top-up for user ${command.userId}`,
    });

    const pendingTopUp = await this.walletRepository.createPendingTopUp({
      userId: command.userId,
      amountInCents: command.amountInCents,
      provider: command.provider,
      externalReference: paymentLink.externalReference,
      metadata: {
        orderCode,
        walletId: wallet.id,
      },
    });

    return {
      transactionId: pendingTopUp.transactionId,
      checkoutUrl: paymentLink.checkoutUrl,
      externalReference: paymentLink.externalReference,
    };
  }
}
