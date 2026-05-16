import { PaymentProvider } from '../../domain/repositories/payment-gateway.interface';

/** CQRS Command designed to enforce  top up wallet. */
export class TopUpWalletCommand {
  constructor(
    public readonly userId: string,
    public readonly amountInCents: bigint,
    public readonly provider: PaymentProvider,
    public readonly returnUrl: string,
    public readonly cancelUrl: string,
    public readonly correlationId: string,
  ) {}
}
