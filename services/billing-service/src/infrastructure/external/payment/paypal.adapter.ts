import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { core, orders } from '@paypal/checkout-server-sdk';
import type { HttpRequest } from '@paypal/paypalhttp';
import {
  CreatePaymentLinkInput,
  CreatePaymentLinkResult,
  IPaymentGateway,
  VerifyWebhookInput,
  VerifyWebhookResult,
} from '../../../domain/repositories/payment-gateway.interface';

/** Represents the  paypal adapter component. */
@Injectable()
export class PaypalAdapter implements IPaymentGateway {
  readonly provider = 'PAYPAL' as const;
  private readonly client: core.PayPalHttpClient;
  private readonly currency: string;
  private readonly webhookId: string;

  constructor(private readonly config: ConfigService) {
    const clientId = this.config.get<string>('PAYPAL_CLIENT_ID');
    const clientSecret = this.config.get<string>('PAYPAL_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'Missing PayPal credentials. Required: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET',
      );
    }

    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    const environment = isProduction
      ? new core.LiveEnvironment(clientId, clientSecret)
      : new core.SandboxEnvironment(clientId, clientSecret);

    this.client = new core.PayPalHttpClient(environment);
    this.currency = this.config.get<string>('PAYPAL_CURRENCY', 'USD');
    this.webhookId = this.config.get<string>('PAYPAL_WEBHOOK_ID', '');
  }

  /**
   * Executes the create payment link operation.
   *
   * @param input - The input parameter
   * @returns Result of type Promise<CreatePaymentLinkResult>
   */
  async createPaymentLink(input: CreatePaymentLinkInput): Promise<CreatePaymentLinkResult> {
    const request = new orders.OrdersCreateRequest();
    request.prefer('return=representation');

    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: this.currency,
            value: this.toPaypalAmountValue(input.amountInCents),
          },
          custom_id: input.orderCode,
          description: input.description,
        },
      ],
      application_context: {
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    });

    try {
      const response = await this.client.execute(request);
      const body = response.result as PayPalOrderResponse;
      const approveLink = body.links?.find((link) => link.rel === 'approve')?.href;

      if (!body.id || !approveLink) {
        throw new BadGatewayException(
          'PAYPAL create payment link failed: missing order id or approve URL',
        );
      }

      return {
        checkoutUrl: approveLink,
        externalReference: body.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      throw new BadGatewayException(`PAYPAL create payment link failed: ${message}`);
    }
  }

  /**
   * Executes the verify webhook operation.
   *
   * @param input - The input parameter
   * @returns Result of type Promise<VerifyWebhookResult>
   */
  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    await this.verifyWebhookSignature(input);

    const payload = this.parsePayload(input.rawBody);
    const externalReference = this.extractExternalReference(payload);
    const amountInCents = this.resolveAmountInCents(payload);

    if (!externalReference) {
      throw new UnauthorizedException('Invalid PAYPAL webhook payload: missing external reference');
    }

    if (amountInCents <= 0n) {
      throw new UnauthorizedException('Invalid PAYPAL webhook payload: invalid amount');
    }

    return {
      success: true,
      externalReference,
      amountInCents,
      metadata: payload,
    };
  }

  /**
   * Executes the verify webhook signature operation.
   *
   * @param input - The input parameter
   */
  private async verifyWebhookSignature(input: VerifyWebhookInput): Promise<void> {
    if (!this.webhookId) {
      throw new InternalServerErrorException(
        'Missing PayPal webhook id. Required: PAYPAL_WEBHOOK_ID',
      );
    }

    const payload = this.parsePayload(input.rawBody);
    const transmissionId = this.getHeaderValue(input.headers, 'paypal-transmission-id');
    const transmissionTime = this.getHeaderValue(input.headers, 'paypal-transmission-time');
    const certUrl = this.getHeaderValue(input.headers, 'paypal-cert-url');
    const authAlgo = this.getHeaderValue(input.headers, 'paypal-auth-algo');
    const transmissionSig =
      this.getHeaderValue(input.headers, 'paypal-transmission-sig') || input.signature;

    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      throw new UnauthorizedException(
        'Missing required PayPal webhook headers for signature verification',
      );
    }

    const request: HttpRequest<PayPalVerifyWebhookSignatureRequest> = {
      verb: 'POST',
      path: '/v1/notifications/verify-webhook-signature',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: this.webhookId,
        webhook_event: payload,
      },
    };

    try {
      const response = await this.client.execute(request);
      const result = (response.result || {}) as PayPalVerifyWebhookSignatureResponse;
      if (result.verification_status !== 'SUCCESS') {
        throw new UnauthorizedException('PayPal webhook signature verification failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(`Unable to verify PayPal webhook signature: ${message}`);
    }
  }

  /**
   * Executes the parse payload operation.
   *
   * @param rawBody - The rawBody parameter
   * @returns Result of type Record<string, unknown>
   */
  private parsePayload(rawBody: string): Record<string, unknown> {
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new UnauthorizedException('Invalid PAYPAL webhook body');
      }

      return parsed as Record<string, unknown>;
    } catch {
      throw new UnauthorizedException('Invalid PAYPAL webhook body');
    }
  }

  /**
   * Executes the extract external reference operation.
   *
   * @param payload - The payload parameter
   * @returns Result of type string
   */
  private extractExternalReference(payload: Record<string, unknown>): string {
    const resource = this.asRecord(payload.resource);
    const relatedIds = this.asRecord(resource?.supplementary_data)
      ? this.asRecord(this.asRecord(resource?.supplementary_data)?.related_ids)
      : undefined;

    const orderIdFromRelated = this.asString(relatedIds?.order_id);
    const orderIdFromResource = this.asString(resource?.id);
    const orderIdFromSummary = this.asString(payload.order_id);
    const invoiceId = this.asString(resource?.invoice_id);

    return orderIdFromRelated || orderIdFromSummary || invoiceId || orderIdFromResource || '';
  }

  /**
   * Executes the resolve amount in cents operation.
   *
   * @param payload - The payload parameter
   * @returns Result of type bigint
   */
  private resolveAmountInCents(payload: Record<string, unknown>): bigint {
    const resource = this.asRecord(payload.resource);
    const amountCandidates: unknown[] = [
      resource?.amount,
      this.asRecord(resource?.seller_receivable_breakdown)?.gross_amount,
      this.asRecord(resource?.seller_receivable_breakdown)?.net_amount,
      this.asRecord(resource?.payment_instruction)?.amount,
    ];

    for (const candidate of amountCandidates) {
      const amount = this.extractAmountFromRecord(candidate);
      if (amount > 0n) {
        return amount;
      }
    }

    return 0n;
  }

  /**
   * Executes the extract amount from record operation.
   *
   * @param value - The value parameter
   * @returns Result of type bigint
   */
  private extractAmountFromRecord(value: unknown): bigint {
    const amount = this.asRecord(value);
    const amountValue = this.asString(amount?.value);
    if (!amountValue) {
      return 0n;
    }

    const normalized = Number.parseFloat(amountValue);
    if (!Number.isFinite(normalized) || normalized <= 0) {
      return 0n;
    }

    return BigInt(Math.round(normalized * 100));
  }

  /**
   * Executes the to paypal amount value operation.
   *
   * @param amountInCents - The amountInCents parameter
   * @returns Result of type string
   */
  private toPaypalAmountValue(amountInCents: bigint): string {
    const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
    if (amountInCents <= 0n || amountInCents > maxSafe) {
      throw new InternalServerErrorException('Invalid PAYPAL amount');
    }

    const amount = Number(amountInCents) / 100;
    return amount.toFixed(2);
  }

  /**
   * Executes the as record operation.
   *
   * @param value - The value parameter
   * @returns Result of type Record<string, unknown> | undefined
   */
  private asRecord(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    return value as Record<string, unknown>;
  }

  /**
   * Executes the as string operation.
   *
   * @param value - The value parameter
   * @returns Result of type string | undefined
   */
  private asString(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }

    return undefined;
  }

  /**
   * Executes the get header value operation.
   *
   * @param headers - The headers parameter
   * @param key - The key parameter
   * @returns Result of type string | undefined
   */
  private getHeaderValue(
    headers: Record<string, string | string[] | undefined>,
    key: string,
  ): string | undefined {
    const value = headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()];
    if (Array.isArray(value)) {
      return value[0];
    }

    return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
  }
}

type PayPalOrderResponse = {
  id?: string;
  status?: string;
  links?: Array<{
    href?: string;
    rel?: string;
  }>;
  purchase_units?: Array<{
    amount?: {
      value?: string;
      currency_code?: string;
    };
  }>;
};

type PayPalVerifyWebhookSignatureRequest = {
  auth_algo: string;
  cert_url: string;
  transmission_id: string;
  transmission_sig: string;
  transmission_time: string;
  webhook_id: string;
  webhook_event: Record<string, unknown>;
};

type PayPalVerifyWebhookSignatureResponse = {
  verification_status?: 'SUCCESS' | 'FAILURE' | string;
};
