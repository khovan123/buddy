import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayOS, PayOSError, type CreatePaymentLinkRequest, type Webhook } from '@payos/node';
import {
  CreatePaymentLinkInput,
  CreatePaymentLinkResult,
  IPaymentGateway,
  VerifyWebhookInput,
  VerifyWebhookResult,
} from '../../../domain/repositories/payment-gateway.interface';
import type {
  CreatePayoutInput,
  CreatePayoutResult,
  IPayoutGateway,
  VerifyBankAccountInput,
  VerifyBankAccountResult,
} from '../../../domain/repositories/payout-gateway.interface';

/** Represents the  pay o s adapter component. */
@Injectable()
export class PayOSAdapter implements IPaymentGateway, IPayoutGateway {
  readonly provider = 'PAYOS' as const;
  private readonly payosClient: PayOS;

  constructor(private readonly config: ConfigService) {
    const clientId = this.config.get<string>('PAYOS_CLIENT_ID');
    const apiKey = this.config.get<string>('PAYOS_API_KEY');
    const checksumKey = this.config.get<string>('PAYOS_CHECKSUM_KEY');

    if (!clientId || !apiKey || !checksumKey) {
      throw new InternalServerErrorException(
        [
          'Missing PAYOS credentials.',
          'Required: PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY',
        ].join(' '),
      );
    }

    this.payosClient = new PayOS({
      clientId,
      apiKey,
      checksumKey,
      // baseURL: this.config.get<string>('PAYOS_API_BASE_URL'),
    });
  }

  /**
   * Executes the create payment link operation.
   *
   * @param input - The input parameter
   * @returns Result of type Promise<CreatePaymentLinkResult>
   */
  async createPaymentLink(input: CreatePaymentLinkInput): Promise<CreatePaymentLinkResult> {
    const orderCode = this.toPayOSOrderCode(input.orderCode);
    const amount = this.toPayOSAmount(input.amountInCents);
    const description = this.toPayOSDescription(orderCode);

    const requestBody: CreatePaymentLinkRequest = {
      orderCode,
      amount,
      description,
      returnUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
    };

    try {
      const result = await this.payosClient.paymentRequests.create(requestBody);

      if (!result.checkoutUrl) {
        throw new BadGatewayException('PAYOS create payment link failed: missing checkoutUrl');
      }

      return {
        checkoutUrl: result.checkoutUrl,
        externalReference: String(result.orderCode),
      };
    } catch (error) {
      const message =
        error instanceof PayOSError || error instanceof Error ? error.message : 'unknown error';
      throw new BadGatewayException(`PAYOS create payment link failed: ${message}`);
    }
  }

  /**
   * Executes the verify webhook operation.
   *
   * @param input - The input parameter
   * @returns Result of type Promise<VerifyWebhookResult>
   */
  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    const payload = this.parsePayload(input.rawBody);

    try {
      const verifiedData = await this.payosClient.webhooks.verify(payload);
      const externalReference = String(verifiedData.orderCode);
      const amountInCents = BigInt(verifiedData.amount);

      if (!externalReference || amountInCents <= 0n) {
        throw new UnauthorizedException('Invalid PAYOS webhook payload');
      }

      return {
        success: true,
        externalReference,
        amountInCents,
        metadata: verifiedData as unknown as Record<string, unknown>,
      };
    } catch (error) {
      const message =
        error instanceof PayOSError || error instanceof Error
          ? error.message
          : 'Invalid PAYOS webhook payload';
      throw new UnauthorizedException(`PAYOS webhook verification failed: ${message}`);
    }
  }

  // ── IPayoutGateway ──────────────────────────────────────────────────

  /**
   * Verify a bank account via PayOS by calling estimateCredit with validateDestination.
   */
  async verifyBankAccount(input: VerifyBankAccountInput): Promise<VerifyBankAccountResult> {
    try {
      const batchRequest = {
        referenceId: `verify_${Date.now()}`,
        validateDestination: true,
        category: null,
        payouts: [
          {
            referenceId: `verify_item_${Date.now()}`,
            amount: 1000, // Minimum amount for estimation (not actually sent)
            description: 'XACTK',
            toBin: input.bankBin,
            toAccountNumber: input.accountNumber,
          },
        ],
      };

      const result = await this.payosClient.payouts.estimateCredit(batchRequest);

      console.debug({ result });

      // If estimateCredit succeeds with validateDestination, the account is valid.
      // The account name is returned in the batch response transactions.
      // However, estimateCredit only returns estimateCredit number, not account names.
      // We use the batch create approach instead — let's create a batch with validateDestination.
      // Actually, the batch payout API returns toAccountName in the transaction response.
      // For verification only, we'll use a small payout batch with validation.

      if (result && typeof result.estimateCredit === 'number') {
        // estimateCredit succeeded → the account is reachable
        // To get the account name, we need to look at payout transaction response
        return { valid: true, accountName: null };
      }

      return { valid: false, accountName: null };
    } catch (error) {
      // If PayOS rejects, the bank account is invalid
      console.debug({ error });

      return { valid: false, accountName: null };
    }
  }

  /**
   * Create a PayOS payout to transfer money to a bank account.
   */
  async createPayout(input: CreatePayoutInput): Promise<CreatePayoutResult> {
    try {
      const result = await this.payosClient.payouts.create(
        {
          referenceId: input.referenceId,
          amount: input.amount,
          description: input.description,
          toBin: input.toBin,
          toAccountNumber: input.toAccountNumber,
        },
        input.referenceId, // idempotencyKey = referenceId
      );

      const txn = result.transactions?.[0];

      return {
        payoutId: result.id,
        state: txn?.state ?? result.approvalState,
      };
    } catch (error) {
      const message =
        error instanceof PayOSError || error instanceof Error ? error.message : 'unknown error';
      throw new BadGatewayException(`PAYOS create payout failed: ${message}`);
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────

  /**
   * Executes the parse payload operation.
   *
   * @param rawBody - The rawBody parameter
   * @returns Result of type Webhook
   */
  private parsePayload(rawBody: string): Webhook {
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new UnauthorizedException('Invalid PAYOS webhook body');
      }

      return parsed as Webhook;
    } catch {
      throw new UnauthorizedException('Invalid PAYOS webhook body');
    }
  }

  /**
   * Executes the to pay o s order code operation.
   *
   * @param orderCode - The orderCode parameter
   * @returns Result of type number
   */
  private toPayOSOrderCode(orderCode: string): number {
    const onlyDigits = orderCode.replace(/\D/g, '');
    const selectedDigits = onlyDigits.length > 0 ? onlyDigits.slice(-13) : `${Date.now()}`;
    const parsed = Number.parseInt(selectedDigits, 10);

    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new InternalServerErrorException('Invalid PAYOS orderCode generated from input');
    }

    return parsed;
  }

  /**
   * Executes the to pay o s amount operation.
   *
   * @param amountInCents - The amountInCents parameter
   * @returns Result of type number
   */
  private toPayOSAmount(amountInCents: bigint): number {
    const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
    if (amountInCents <= 0n || amountInCents > maxSafe) {
      throw new InternalServerErrorException('Invalid PAYOS amount');
    }

    return Number(amountInCents);
  }

  /**
   * Executes the to pay o s description operation.
   *
   * @param orderCode - The orderCode parameter
   * @returns Result of type string
   */
  private toPayOSDescription(orderCode: number): string {
    // Keep <=9 chars to satisfy strict bank transfer description constraints.
    const compactCode = String(orderCode).slice(-6).padStart(6, '0');
    return `NAP${compactCode}`;
  }
}
