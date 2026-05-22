export type PaymentProvider = 'SEPAY';

export type CreatePaymentLinkInput = {
  amountInCents: bigint;
  orderCode: string;
  userId: string;
  returnUrl: string;
  cancelUrl: string;
  description: string;
};

export type CreatePaymentLinkResult = {
  checkoutUrl: string;
  externalReference: string;
};

export type VerifyWebhookInput = {
  signature?: string;
  rawBody: string;
  headers: Record<string, string | string[] | undefined>;
};

export type VerifyWebhookResult = {
  success: boolean;
  externalReference: string;
  amountInCents: bigint;
  metadata?: Record<string, unknown>;
};

/** Interface representing data constraints for  i payment gateway. */
export interface IPaymentGateway {
  readonly provider: PaymentProvider;

  createPaymentLink(input: CreatePaymentLinkInput): Promise<CreatePaymentLinkResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult>;
}
