import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  type IPaymentGateway,
  type PaymentProvider,
} from '../../../domain/repositories/payment-gateway.interface';
import { PAYMENT_GATEWAYS } from '../../../domain/repositories/tokens';

/** Represents the  payment gateway factory component. */
@Injectable()
export class PaymentGatewayFactory {
  private readonly gatewayByProvider: Map<PaymentProvider, IPaymentGateway>;

  constructor(@Inject(PAYMENT_GATEWAYS) gateways: IPaymentGateway[]) {
    this.gatewayByProvider = new Map(gateways.map((gateway) => [gateway.provider, gateway]));
  }

  /**
   * Executes the get gateway operation.
   *
   * @param provider - The provider parameter
   * @returns Result of type IPaymentGateway
   */
  getGateway(provider: PaymentProvider): IPaymentGateway {
    const gateway = this.gatewayByProvider.get(provider);
    if (!gateway) {
      throw new NotFoundException(`Unsupported payment provider: ${provider}`);
    }

    return gateway;
  }
}
