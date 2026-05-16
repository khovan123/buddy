import { PaymentProvider } from '../../domain/repositories/payment-gateway.interface';

/** CQRS Command designed to enforce  confirm top up. */
export class ConfirmTopUpCommand {
  constructor(
    public readonly provider: PaymentProvider,
    public readonly rawBody: string,
    public readonly signature: string | undefined,
    public readonly headers: Record<string, string | string[] | undefined>,
    public readonly correlationId: string,
  ) {}
}
