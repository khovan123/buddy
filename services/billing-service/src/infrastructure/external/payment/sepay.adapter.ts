import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import { SePayPgClient } from 'sepay-pg-node';
import {
  CreatePaymentLinkInput,
  CreatePaymentLinkResult,
  IPaymentGateway,
  VerifyWebhookInput,
  VerifyWebhookResult,
} from '../../../domain/repositories/payment-gateway.interface';
import type {
  BankProvider,
  CreatePayoutInput,
  CreatePayoutResult,
  IPayoutGateway,
  VerifyBankAccountInput,
  VerifyBankAccountResult,
} from '../../../domain/repositories/payout-gateway.interface';

/** SePay payment gateway adapter using the official sepay-pg-node SDK. */
@Injectable()
export class SePayAdapter implements IPaymentGateway, IPayoutGateway {
  readonly provider = 'SEPAY' as const;
  private readonly client: SePayPgClient;
  private readonly secretKey: string;
  private readonly userApiBaseUrl: string;
  private readonly userApiToken?: string;
  private readonly vietQrApiKey?: string;
  private readonly bankProvidersUrl: string;
  private readonly vietQrClientId?: string;
  private readonly vietQrLookupUrl: string;
  private readonly webhookApiKey?: string;
  private readonly webhookSecretKey: string;
  private bankProvidersCache: { data: BankProvider[]; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {
    const merchantId = this.config.get<string>('SEPAY_MERCHANT_ID');
    const secretKey = this.config.get<string>('SEPAY_SECRET_KEY');
    const env = this.config.get<string>('SEPAY_ENV', 'sandbox') as 'sandbox' | 'production';

    if (!merchantId || !secretKey) {
      throw new InternalServerErrorException(
        'Missing SePay credentials. Required: SEPAY_MERCHANT_ID, SEPAY_SECRET_KEY',
      );
    }

    this.secretKey = secretKey;
    this.webhookSecretKey = this.config.get<string>('SEPAY_WEBHOOK_SECRET_KEY') ?? secretKey;
    // this.webhookApiKey = this.config.get<string>('SEPAY_WEBHOOK_API_KEY');
    this.userApiToken = this.config.get<string>('SEPAY_API_TOKEN');
    this.vietQrApiKey = this.config.get<string>('VIETQR_API_KEY');
    this.vietQrClientId = this.config.get<string>('VIETQR_CLIENT_ID');
    this.bankProvidersUrl =
      this.config.get<string>('BANK_PROVIDERS_URL') ??
      this.config.get<string>('VIETQR_BANKS_URL') ??
      'https://api.vietqr.io/v2/banks';
    this.vietQrLookupUrl =
      this.config.get<string>('VIETQR_LOOKUP_URL') ?? 'https://api.vietqr.io/v2/lookup';
    this.userApiBaseUrl = this.normalizeBaseUrl(
      this.config.get<string>('SEPAY_USER_API_BASE_URL') ??
        (env === 'production'
          ? 'https://userapi.sepay.vn/v2'
          : 'https://userapi-sandbox.sepay.vn/v2'),
    );

    this.client = new SePayPgClient({
      env,
      merchant_id: merchantId,
      secret_key: secretKey,
    });
  }

  // ── IPaymentGateway ────────────────────────────────────────────────

  /**
   * Creates a SePay checkout payment link using the form-redirect flow.
   * Returns the checkout URL and invoice number as external reference.
   */
  async createPaymentLink(input: CreatePaymentLinkInput): Promise<CreatePaymentLinkResult> {
    const invoiceNumber = `INV-${Date.now()}-${input.orderCode}`;
    const amount = this.toSePayAmount(input.amountInCents);

    try {
      const checkoutUrl = this.client.checkout.initCheckoutUrl();

      const formFields = this.client.checkout.initOneTimePaymentFields({
        operation: 'PURCHASE',
        payment_method: 'BANK_TRANSFER',
        order_invoice_number: invoiceNumber,
        order_amount: amount,
        currency: 'VND',
        order_description: input.description
          ? `${input.orderCode} ${invoiceNumber} ${input.description}`
          : `${input.orderCode} ${invoiceNumber}`,
        customer_id: input.userId,
        success_url: input.returnUrl,
        error_url: input.cancelUrl,
        cancel_url: input.cancelUrl,
        custom_data: JSON.stringify({ orderCode: input.orderCode, userId: input.userId }),
      });

      // Build the full checkout URL with form fields as query params for redirect
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(formFields)) {
        params.set(key, String(value));
      }

      const fullCheckoutUrl = `${checkoutUrl}?${params.toString()}`;

      return {
        checkoutUrl: fullCheckoutUrl,
        externalReference: invoiceNumber,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      throw new BadGatewayException(`SEPAY create payment link failed: ${message}`);
    }
  }

  /**
   * Verifies and parses a SePay IPN (Instant Payment Notification) callback.
   * Validates the X-Secret-Key header and extracts order/transaction data.
   */
  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    const payload = this.parsePayload(input.rawBody);
    this.verifyWebhookAuthentication(input);

    if (this.isPaymentGatewayIpn(payload)) {
      return this.verifyPaymentGatewayIpn(payload);
    }

    return this.verifyBankTransactionWebhook(payload as SePayWebhookPayload);
  }

  verifyWebhookRequest(input: VerifyWebhookInput): void {
    this.parsePayload(input.rawBody);
    this.verifyWebhookAuthentication(input);
  }

  // ── IPayoutGateway ─────────────────────────────────────────────────

  /**
   * Lists bank providers from a compatible JSON endpoint.
   *
   * Expected shape: `{ data: [{ id, name, code, bin, shortName, logo,
   * transferSupported, lookupSupported }] }`, the same shape returned by VietQR.
   * Configure `BANK_PROVIDERS_URL=https://link.com` to use another maintained list.
   * The static fallback keeps payout setup usable if the configured catalog is unavailable.
   */
  async listBankProviders(): Promise<BankProvider[]> {
    if (this.bankProvidersCache && this.bankProvidersCache.expiresAt > Date.now()) {
      return this.bankProvidersCache.data;
    }

    try {
      const response = await fetch(this.bankProvidersUrl, {
        headers: { Accept: 'application/json' },
      });
      const body = (await response.json().catch(() => undefined)) as unknown;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const parsedBanks =
        body && typeof body === 'object' ? (body as VietQrBanksResponse).data : undefined;
      const data: VietQrBank[] = Array.isArray(parsedBanks) ? parsedBanks : [];

      const banks = data
        .map((bank) => this.toBankProvider(bank))
        .filter((bank): bank is BankProvider => Boolean(bank));

      const result = banks.length > 0 ? banks : FALLBACK_BANK_PROVIDERS;
      this.bankProvidersCache = {
        data: result,
        expiresAt: Date.now() + 1000 * 60 * 60,
      };
      return result;
    } catch {
      return FALLBACK_BANK_PROVIDERS;
    }
  }

  /**
   * Verifies that a bank account is present in the merchant's linked SePay API v2 accounts.
   */
  async verifyBankAccount(input: VerifyBankAccountInput): Promise<VerifyBankAccountResult> {
    const vietQrResult = await this.verifyBankAccountWithVietQr(input);
    if (vietQrResult) {
      return vietQrResult;
    }

    const token = this.requireUserApiToken('verify bank account');
    const params = new URLSearchParams({
      q: input.accountNumber,
      per_page: '100',
    });

    const response = await this.callSePayUserApi<SePayBankAccountsResponse>(
      `/bank-accounts?${params.toString()}`,
      token,
    );

    const bankBin = this.normalizeDigits(input.bankBin);
    const accountNumber = this.normalizeDigits(input.accountNumber);
    const account = response.data.find(
      (candidate) =>
        this.normalizeDigits(candidate.account_number) === accountNumber &&
        this.normalizeDigits(candidate.bank_bin) === bankBin &&
        this.isSePayAccountActive(candidate),
    );

    return {
      valid: Boolean(account),
      accountName: account?.account_holder_name ?? null,
      bankName: account?.bank_full_name ?? account?.bank_short_name ?? null,
    };
  }

  /**
   * SePay's public API v2/Bank Hub docs expose reconciliation, linked-account and VA flows,
   * but not an outbound transfer endpoint. Keep withdrawals trackable for manual settlement.
   */
  async createPayout(input: CreatePayoutInput): Promise<CreatePayoutResult> {
    return {
      payoutId: `SEPAY-MANUAL-${input.referenceId}`,
      state: 'PENDING_MANUAL_TRANSFER',
    };
  }

  // ── Private helpers ────────────────────────────────────────────────

  /**
   * Converts amountInCents (bigint, VND) to a number for SePay.
   * SePay expects whole VND amounts (no subunits).
   */
  private toSePayAmount(amountInCents: bigint): number {
    const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
    if (amountInCents <= 0n || amountInCents > maxSafe) {
      throw new InternalServerErrorException('Invalid SEPAY amount');
    }

    return Number(amountInCents);
  }

  /**
   * Parses a decimal string amount (e.g. "50000.00") to bigint cents.
   */
  private parseAmountToCents(rawAmount: string): bigint {
    const normalized = Number.parseFloat(rawAmount);
    if (!Number.isFinite(normalized) || normalized <= 0) {
      return 0n;
    }

    return BigInt(Math.round(normalized));
  }

  private parsePayload(rawBody: string): SePayIpnPayload {
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new UnauthorizedException('Invalid SEPAY IPN body');
      }

      return parsed as SePayIpnPayload;
    } catch {
      const multipartPayload = this.parseMultipartPayload(rawBody);
      if (multipartPayload) {
        return multipartPayload as SePayIpnPayload;
      }

      const formPayload = this.parseFormPayload(rawBody);
      if (formPayload) {
        return formPayload as SePayIpnPayload;
      }

      throw new UnauthorizedException('Invalid SEPAY IPN body');
    }
  }

  private parseFormPayload(rawBody: string): Record<string, unknown> | null {
    const params = new URLSearchParams(rawBody);
    const payload: Record<string, unknown> = {};

    for (const [key, value] of params.entries()) {
      payload[key] = value;
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }

  private parseMultipartPayload(rawBody: string): Record<string, unknown> | null {
    const boundary = rawBody.match(/^--([^\r\n]+)/)?.[1];
    if (!boundary) {
      return null;
    }

    const payload: Record<string, unknown> = {};
    for (const part of rawBody.split(`--${boundary}`)) {
      const name = part.match(/name="([^"]+)"/)?.[1];
      if (!name) {
        continue;
      }

      const [, value] = part.split(/\r?\n\r?\n/, 2);
      const normalizedValue = value?.replace(/\r?\n--$/, '').trim();
      if (normalizedValue !== undefined) {
        payload[name] = normalizedValue;
      }
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }

  private verifyPaymentGatewayIpn(payload: SePayIpnPayload): VerifyWebhookResult {
    if (payload.notification_type !== 'ORDER_PAID') {
      throw new UnauthorizedException(
        `SEPAY IPN: unexpected notification type: ${payload.notification_type}`,
      );
    }

    const order = payload.order;
    if (!order || typeof order !== 'object') {
      throw new UnauthorizedException('SEPAY IPN: missing order data');
    }

    const externalReference = String(order.order_invoice_number || '');
    const rawAmount = String(order.order_amount || '0');
    const amountInCents = this.parseAmountToCents(rawAmount);

    if (!externalReference) {
      throw new UnauthorizedException('SEPAY IPN: missing order_invoice_number');
    }

    if (amountInCents <= 0n) {
      throw new UnauthorizedException('SEPAY IPN: invalid order_amount');
    }

    return {
      success: true,
      externalReference,
      amountInCents,
      metadata: payload as unknown as Record<string, unknown>,
    };
  }

  private verifyBankTransactionWebhook(payload: SePayWebhookPayload): VerifyWebhookResult {
    if (payload.transferType !== 'in') {
      throw new UnauthorizedException(
        `SEPAY webhook: unexpected transfer type: ${payload.transferType}`,
      );
    }

    const externalReference = this.extractExternalReference(payload);
    const amountInCents = this.parseAmountToCents(String(payload.transferAmount ?? '0'));

    if (!externalReference) {
      throw new UnauthorizedException('SEPAY webhook: missing payment code');
    }

    if (amountInCents <= 0n) {
      throw new UnauthorizedException('SEPAY webhook: invalid transferAmount');
    }

    return {
      success: true,
      externalReference,
      amountInCents,
      metadata: payload as unknown as Record<string, unknown>,
    };
  }

  private verifyWebhookAuthentication(input: VerifyWebhookInput): void {
    const incomingSecret = this.getHeaderValue(input.headers, 'x-secret-key');
    if (incomingSecret && this.safeEquals(incomingSecret, this.secretKey)) {
      return;
    }

    const authorization = this.getHeaderValue(input.headers, 'authorization');
    if (authorization?.startsWith('Apikey ') && this.webhookApiKey) {
      const incomingApiKey = authorization.slice('Apikey '.length);
      if (this.safeEquals(incomingApiKey, this.webhookApiKey)) {
        return;
      }
    }

    const signature = input.signature ?? this.getHeaderValue(input.headers, 'x-sepay-signature');
    const timestamp = this.getHeaderValue(input.headers, 'x-sepay-timestamp');
    if (signature && timestamp && this.verifyHmacSignature(signature, timestamp, input.rawBody)) {
      return;
    }

    throw new UnauthorizedException('SEPAY webhook verification failed');
  }

  private verifyHmacSignature(signature: string, timestamp: string, rawBody: string): boolean {
    if (!timestamp.trim()) {
      return false;
    }

    const expected = crypto
      .createHmac('sha256', this.webhookSecretKey)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');
    const incoming = signature.startsWith('sha256=')
      ? signature.slice('sha256='.length)
      : signature;

    return this.safeEquals(incoming, expected);
  }

  private async callSePayUserApi<T>(path: string, token: string): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.userApiBaseUrl}${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      throw new BadGatewayException(`SEPAY API request failed: ${message}`);
    }

    const body = (await response.json().catch(() => undefined)) as unknown;
    if (!response.ok) {
      const message = this.extractSePayErrorMessage(body) ?? response.statusText;
      throw new BadGatewayException(`SEPAY API request failed (${response.status}): ${message}`);
    }

    return body as T;
  }

  private async verifyBankAccountWithVietQr(
    input: VerifyBankAccountInput,
  ): Promise<VerifyBankAccountResult | null> {
    if (!this.vietQrApiKey || !this.vietQrClientId) {
      return null;
    }

    let response: Response;
    try {
      response = await fetch(this.vietQrLookupUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': this.vietQrApiKey,
          'x-client-id': this.vietQrClientId,
        },
        body: JSON.stringify({
          bin: Number(this.normalizeDigits(input.bankBin)),
          accountNumber: this.normalizeDigits(input.accountNumber),
        }),
      });
    } catch {
      return null;
    }

    const body = (await response.json().catch(() => undefined)) as unknown;
    if (!response.ok) {
      return null;
    }

    const payload = body as VietQrLookupResponse;
    const accountName =
      payload.code === '00' && typeof payload.data?.accountName === 'string'
        ? payload.data.accountName.trim()
        : '';

    if (!accountName) {
      return { valid: false, accountName: null };
    }

    const bank = (await this.listBankProviders()).find(
      (item) => item.bin === this.normalizeDigits(input.bankBin),
    );

    return {
      valid: true,
      accountName,
      bankName: bank?.name ?? bank?.shortName ?? null,
    };
  }

  private toBankProvider(bank: VietQrBank): BankProvider | null {
    const bin = this.normalizeDigits(bank.bin);
    if (!bin) {
      return null;
    }

    return {
      id: String(bank.id ?? bin),
      name: bank.name || bank.shortName || bank.code || bin,
      shortName: bank.shortName || bank.code || bank.name || bin,
      code: bank.code || bank.shortName || bin,
      bin,
      logo: bank.logo || undefined,
      lookupSupported: String(bank.lookupSupported ?? '0') === '1',
      transferSupported: String(bank.transferSupported ?? '0') === '1',
    };
  }

  private extractExternalReference(payload: SePayWebhookPayload): string {
    const content = typeof payload.content === 'string' ? payload.content : '';
    const invoiceMatch = content.match(/\bINV-\d+-[A-Za-z0-9_-]+\b/);
    if (invoiceMatch?.[0]) {
      return invoiceMatch[0];
    }

    const orderCodeMatch = content.match(/\bSEPAY-\d+\b/);
    if (orderCodeMatch?.[0]) {
      return orderCodeMatch[0];
    }

    const code = typeof payload.code === 'string' ? payload.code.trim() : '';
    return code;
  }

  private isPaymentGatewayIpn(payload: SePayIpnPayload): boolean {
    return Boolean(payload.notification_type || payload.order);
  }

  private requireUserApiToken(action: string): string {
    if (!this.userApiToken) {
      throw new InternalServerErrorException(
        `Missing SePay API token. Required for ${action}: SEPAY_USER_API_TOKEN or SEPAY_API_TOKEN`,
      );
    }

    return this.userApiToken;
  }

  private normalizeBaseUrl(value: string): string {
    return value.replace(/\/+$/, '');
  }

  private normalizeDigits(value: string | number | undefined): string {
    return String(value ?? '').replace(/\D/g, '');
  }

  private extractSePayErrorMessage(body: unknown): string | undefined {
    if (!body || typeof body !== 'object') {
      return undefined;
    }

    const record = body as Record<string, unknown>;
    return typeof record.message === 'string' ? record.message : undefined;
  }

  private isSePayAccountActive(account: SePayBankAccount): boolean {
    return account.active === undefined || String(account.active) === '1';
  }

  private safeEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return (
      leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
    );
  }

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

// ── SePay IPN Type Definitions ─────────────────────────────────────

type SePayIpnOrder = {
  id?: string;
  order_id?: string;
  order_status?: string;
  order_currency?: string;
  order_amount?: string;
  order_invoice_number?: string;
  custom_data?: unknown[];
  order_description?: string;
};

type SePayIpnTransaction = {
  id?: string;
  payment_method?: string;
  transaction_id?: string;
  transaction_type?: string;
  transaction_date?: string;
  transaction_status?: string;
  transaction_amount?: string;
  transaction_currency?: string;
};

type SePayIpnPayload = {
  timestamp?: number;
  notification_type?: string;
  order?: SePayIpnOrder;
  transaction?: SePayIpnTransaction;
  customer?: {
    id?: string;
    customer_id?: string;
  };
};

type SePayWebhookPayload = {
  id?: number;
  gateway?: string;
  transactionDate?: string;
  accountNumber?: string;
  subAccount?: string;
  code?: string | null;
  content?: string;
  transferType?: 'in' | 'out' | string;
  description?: string;
  transferAmount?: number;
  accumulated?: number;
  referenceCode?: string;
};

type SePayBankAccount = {
  id: string;
  account_holder_name: string;
  account_number: string;
  bank_bin: string;
  bank_short_name?: string;
  bank_full_name?: string;
  bank_code?: string;
  active?: number | string;
};

type SePayBankAccountsResponse = {
  status: string;
  data: SePayBankAccount[];
};

type VietQrBank = {
  id?: number | string;
  name?: string;
  code?: string;
  bin?: string | number;
  shortName?: string;
  logo?: string;
  transferSupported?: number | string;
  lookupSupported?: number | string;
};

type VietQrBanksResponse = {
  code?: string;
  desc?: string;
  data?: VietQrBank[];
};

type VietQrLookupResponse = {
  code?: string;
  desc?: string;
  data?: {
    accountName?: string;
  };
};

const FALLBACK_BANK_PROVIDERS: BankProvider[] = [
  {
    id: '970415',
    name: 'Ngan hang TMCP Cong Thuong Viet Nam',
    shortName: 'VietinBank',
    code: 'ICB',
    bin: '970415',
    lookupSupported: true,
    transferSupported: true,
  },
  {
    id: '970436',
    name: 'Ngan hang TMCP Ngoai Thuong Viet Nam',
    shortName: 'Vietcombank',
    code: 'VCB',
    bin: '970436',
    lookupSupported: true,
    transferSupported: true,
  },
  {
    id: '970418',
    name: 'Ngan hang TMCP Dau tu va Phat trien Viet Nam',
    shortName: 'BIDV',
    code: 'BIDV',
    bin: '970418',
    lookupSupported: true,
    transferSupported: true,
  },
  {
    id: '970422',
    name: 'Ngan hang TMCP Quan Doi',
    shortName: 'MB Bank',
    code: 'MB',
    bin: '970422',
    lookupSupported: true,
    transferSupported: true,
  },
  {
    id: '970416',
    name: 'Ngan hang TMCP A Chau',
    shortName: 'ACB',
    code: 'ACB',
    bin: '970416',
    lookupSupported: true,
    transferSupported: true,
  },
];
