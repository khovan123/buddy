import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { JwtAuthGuard } from '@libs/common';
import { CanActivate, ExecutionContext, ValidationPipe, VersioningType } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { AppModule } from '../../src/app.module';
import { IContentValidator } from '../../src/domain/services/content-validator.interface';
import {
  CreatePaymentLinkInput,
  CreatePaymentLinkResult,
  IPaymentGateway,
  VerifyWebhookInput,
  VerifyWebhookResult,
} from '../../src/domain/repositories/payment-gateway.interface';
import { CONTENT_VALIDATOR, PAYMENT_GATEWAYS } from '../../src/domain/repositories/tokens';
import { ContentCatalogRpcPublisher } from '../../src/infrastructure/messaging/publishers/content-catalog.rpc';
import type { Prisma } from '../../src/infrastructure/persistence/prisma/generated/client';
import { PrismaService } from '../../src/infrastructure/persistence/prisma/prisma.service';

jest.setTimeout(30000);

/**
 * Mock Payment Gateway for E2E Testing
 * Replaces real PayOS/PayPal adapters to avoid external API calls
 */
class MockPaymentGateway implements IPaymentGateway {
  readonly provider: 'PAYOS' | 'PAYPAL';

  constructor(provider: 'PAYOS' | 'PAYPAL') {
    this.provider = provider;
  }

  async createPaymentLink(input: CreatePaymentLinkInput): Promise<CreatePaymentLinkResult> {
    return {
      checkoutUrl: `https://mock-checkout.test/${input.orderCode}`,
      externalReference: `mock_${randomUUID()}`,
    };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    // Mock successful webhook verification
    // In real tests, you'd parse the input.rawBody and validate signature
    const externalRefHeader = input.headers['x-external-ref'];
    const amountHeader = input.headers['x-amount'];
    const externalReference = Array.isArray(externalRefHeader)
      ? externalRefHeader[0] || `mock_ref_${randomUUID()}`
      : externalRefHeader || `mock_ref_${randomUUID()}`;
    const amountInCents = BigInt(
      Array.isArray(amountHeader) ? amountHeader[0] || '100000' : amountHeader || '100000',
    );

    return {
      success: true,
      externalReference,
      amountInCents,
      metadata: { mockProvider: this.provider },
    };
  }
}

class MockContentValidator implements IContentValidator {
  private readonly invalidItems = new Set<string>();

  async validateContentStatus(
    itemId: string,
    itemType:
      | 'RESOURCE'
      | 'TUTORIAL'
      | 'RESOURCE_COLLECTION'
      | 'TUTORIAL_COLLECTION'
      | 'TUTORIAL_BUNDLE'
      | 'TUTORIAL_BUNDLE_COLLECTION',
  ): Promise<boolean> {
    return !this.invalidItems.has(this.toKey(itemType, itemId));
  }

  markInvalid(
    itemType:
      | 'RESOURCE'
      | 'TUTORIAL'
      | 'RESOURCE_COLLECTION'
      | 'TUTORIAL_COLLECTION'
      | 'TUTORIAL_BUNDLE'
      | 'TUTORIAL_BUNDLE_COLLECTION',
    itemId: string,
  ): void {
    this.invalidItems.add(this.toKey(itemType, itemId));
  }

  reset(): void {
    this.invalidItems.clear();
  }

  private toKey(itemType: string, itemId: string): string {
    return `${itemType}:${itemId}`;
  }
}

class MockContentCatalogRpcPublisher {
  private readonly quotes = new Map<
    string,
    {
      sellerId: string;
      priceInCents: bigint;
      items: MockPurchaseCatalogItem[];
    }
  >();

  setQuote(
    itemType:
      | 'RESOURCE'
      | 'TUTORIAL'
      | 'RESOURCE_COLLECTION'
      | 'TUTORIAL_COLLECTION'
      | 'TUTORIAL_BUNDLE'
      | 'TUTORIAL_BUNDLE_COLLECTION',
    itemId: string,
    quote: {
      sellerId: string;
      priceInCents: bigint;
      items: MockPurchaseCatalogItem[];
    },
  ): void {
    this.quotes.set(`${itemType}:${itemId}`, quote);
  }

  async getPurchaseCatalog(input: {
    itemId: string;
    itemType:
      | 'RESOURCE'
      | 'TUTORIAL'
      | 'RESOURCE_COLLECTION'
      | 'TUTORIAL_COLLECTION'
      | 'TUTORIAL_BUNDLE'
      | 'TUTORIAL_BUNDLE_COLLECTION';
    userId: string;
    ownedResourceIds?: string[];
    ownedTutorialIds?: string[];
  }): Promise<{
    sellerId: string;
    priceInCents: bigint;
    items: MockPurchaseCatalogItem[];
  }> {
    const quote = this.quotes.get(`${input.itemType}:${input.itemId}`);
    if (!quote) {
      throw new Error(`No mock quote configured for ${input.itemType}:${input.itemId}`);
    }

    return quote;
  }

  reset(): void {
    this.quotes.clear();
  }
}

type MockPurchaseCatalogItem = {
  itemId: string;
  itemType: string;
  resourceIds: string[];
  tutorialId?: string;
  tutorialIds?: string[];
};

type ApiResponseBody = {
  success?: boolean;
  data?: Record<string, unknown>;
  message?: unknown;
  [key: string]: unknown;
};

class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string>;
      user?: {
        sub: string;
        email: string;
        roles: string[];
      };
    }>();
    const customUserId = request.headers['x-user-id'];
    request.user = {
      sub: customUserId || 'test-user-id',
      email: 'test@unibuddy.dev',
      roles: ['student'],
    };
    return true;
  }
}

function extractErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') {
    return '';
  }

  const payload = body as { message?: unknown };
  if (typeof payload.message === 'string') {
    return payload.message;
  }

  if (Array.isArray(payload.message) && typeof payload.message[0] === 'string') {
    return payload.message[0];
  }

  return '';
}

function extractResponseData(body: ApiResponseBody): Record<string, unknown> {
  const data = body.data;
  if (!data || Array.isArray(data)) {
    return {};
  }

  return data;
}

describe('Billing Service E2E Tests', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let module: TestingModule;
  const mockContentValidator = new MockContentValidator();
  const mockContentCatalogRpcPublisher = new MockContentCatalogRpcPublisher();

  // Helper functions
  const createTestWallet = async (userId: string, balanceInCents: bigint = 0n) => {
    return prisma.client.wallet.upsert({
      where: { userId },
      update: { balanceInCents },
      create: { userId, balanceInCents },
    });
  };

  const createTestTransaction = async (
    walletId: string,
    userId: string,
    type: 'TOP_UP' | 'PURCHASE_DEBIT' | 'PURCHASE_CREDIT',
    status: 'PENDING' | 'SUCCESS' | 'FAILED',
    amountInCents: bigint,
    externalRef?: string,
    metadata?: Record<string, unknown>,
  ) => {
    return prisma.client.walletTransaction.create({
      data: {
        id: randomUUID(),
        walletId,
        userId,
        type,
        status,
        amountInCents,
        provider: type === 'TOP_UP' ? 'PAYOS' : null,
        externalRef: externalRef || (type === 'TOP_UP' ? `ext_${randomUUID()}` : null),
        currency: 'VND',
        metadata: (metadata || { test: true }) as Prisma.InputJsonValue,
      },
    });
  };

  const generateJWT = (userId: string): string => {
    // Mock JWT token for testing (would be base64-encoded in production)
    // This is a minimal JWT-like structure: header.payload.signature
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ sub: userId, iat: Date.now() / 1000 })).toString(
      'base64',
    );
    const signature = 'test-signature';
    return `${header}.${payload}.${signature}`;
  };

  const cleanupDatabase = async () => {
    // Clean up in dependent order (foreign keys)
    await prisma.client.outbox.deleteMany({});
    await prisma.client.userResourceOwnership.deleteMany({});
    await prisma.client.walletTransaction.deleteMany({});
    await prisma.client.wallet.deleteMany({});
  };

  // ─────────────────────────────────────────────────────────────────
  // LIFECYCLE HOOKS
  // ─────────────────────────────────────────────────────────────────

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PAYMENT_GATEWAYS)
      .useValue([new MockPaymentGateway('PAYOS'), new MockPaymentGateway('PAYPAL')])
      .overrideProvider(CONTENT_VALIDATOR)
      .useValue(mockContentValidator)
      .overrideProvider(ContentCatalogRpcPublisher)
      .useValue(mockContentCatalogRpcPublisher)
      .overrideGuard(JwtAuthGuard)
      .useValue(new TestJwtAuthGuard())
      .compile();

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = module.get<PrismaService>(PrismaService);

    // Verify database connection
    await prisma.client.$queryRaw`SELECT 1`;
  });

  const sendJson = async (input: {
    method: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    payload?: Record<string, unknown>;
  }): Promise<{ status: number; body: ApiResponseBody }> => {
    const response = await app.inject({
      method: input.method,
      url: input.url,
      headers: input.headers,
      payload: input.payload,
    });

    let body: ApiResponseBody = {};
    if (response.payload) {
      try {
        body = JSON.parse(response.payload) as Record<string, unknown>;
      } catch {
        body = {};
      }
    }

    return { status: response.statusCode, body };
  };

  afterAll(async () => {
    await cleanupDatabase();
    await app.close();
  });

  afterEach(async () => {
    mockContentValidator.reset();
    mockContentCatalogRpcPublisher.reset();
    await cleanupDatabase();
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 1: TOP-UP WEBHOOK FLOW
  // ─────────────────────────────────────────────────────────────────

  describe('TOP-UP WEBHOOK FLOW', () => {
    it('should successfully process PayOS webhook and credit wallet', async () => {
      // ─ SETUP ─────────────────────────────────────────────────────
      const userId = randomUUID();
      const topupAmount = 100000n; // 100,000 VND

      // Create wallet with 0 balance
      const wallet = await createTestWallet(userId, 0n);

      // Create pending TOP_UP transaction (simulating initial request)
      const externalRef = `ext_${randomUUID()}`;
      const transaction = await createTestTransaction(
        wallet.id,
        userId,
        'TOP_UP',
        'PENDING',
        topupAmount,
        externalRef,
      );

      // ─ ACTION ────────────────────────────────────────────────────
      const response = await sendJson({
        method: 'POST',
        url: '/v1/webhooks/billing/payos',
        headers: {
          'x-external-ref': externalRef,
          'x-amount': topupAmount.toString(),
        },
        payload: {
          id: externalRef,
          amount: topupAmount.toString(),
          status: 'COMPLETED',
        },
      });

      // ─ ASSERTIONS ────────────────────────────────────────────────

      // Assertion 1: HTTP 200 OK
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const responseData = extractResponseData(response.body);
      const correlationIdFromBody = response.body.correlationId;
      const correlationIdFromData = responseData.correlationId;
      const correlationId =
        typeof correlationIdFromBody === 'string'
          ? correlationIdFromBody
          : typeof correlationIdFromData === 'string'
            ? correlationIdFromData
            : undefined;

      // Assertion 2: Transaction status changed to SUCCESS
      const updatedTransaction = await prisma.client.walletTransaction.findUnique({
        where: { id: transaction.id },
      });
      expect(updatedTransaction?.status).toBe('SUCCESS');
      expect(updatedTransaction?.confirmedAt).toBeTruthy();

      // Assertion 3: Wallet balance increased correctly
      const updatedWallet = await prisma.client.wallet.findUnique({
        where: { id: wallet.id },
      });
      expect(updatedWallet?.balanceInCents).toBe(topupAmount);

      // Assertion 4: Outbox record created with WALLET_TOPPED_UP event
      const outboxRecord = await prisma.client.outbox.findFirst({
        where: correlationId
          ? { routingKey: 'WALLET_TOPPED_UP', correlationId }
          : { routingKey: 'WALLET_TOPPED_UP' },
      });
      expect(outboxRecord).toBeTruthy();
      expect(outboxRecord?.status).toBe('PENDING');
      expect(outboxRecord?.exchange).toBe('billing.events');
      expect(outboxRecord?.type).toBe('WALLET_TOPPED_UP');
    });

    it.skip('should successfully process PayPal webhook and credit wallet', async () => {
      // ─ SETUP ─────────────────────────────────────────────────────
      const userId = randomUUID();
      const topupAmount = 500000n; // 500,000 VND

      const wallet = await createTestWallet(userId, 0n);
      const externalRef = `ext_${randomUUID()}`;
      await createTestTransaction(wallet.id, userId, 'TOP_UP', 'PENDING', topupAmount, externalRef);

      // ─ ACTION ────────────────────────────────────────────────────
      const response = await sendJson({
        method: 'POST',
        url: '/v1/webhooks/billing/paypal',
        headers: {
          'x-external-ref': externalRef,
          'x-amount': topupAmount.toString(),
        },
        payload: {
          id: externalRef,
          status: 'COMPLETED',
          purchase_units: [{ amount: { value: (Number(topupAmount) / 100).toFixed(2) } }],
        },
      });

      // ─ ASSERTIONS ────────────────────────────────────────────────
      expect(response.status).toBe(200);

      const updatedWallet = await prisma.client.wallet.findUnique({
        where: { id: wallet.id },
      });
      expect(updatedWallet?.balanceInCents).toBe(topupAmount);

      const outboxRecord = await prisma.client.outbox.findFirst({
        where: { routingKey: 'WALLET_TOPPED_UP' },
      });
      expect(outboxRecord).toBeTruthy();
      expect(outboxRecord?.status).toBe('PENDING');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 2: PURCHASE FLOW USING RPC QUOTES
  // ─────────────────────────────────────────────────────────────────

  describe('PURCHASE FLOW USING RPC QUOTES', () => {
    it('should successfully purchase using the quoted amount from content-service', async () => {
      const buyerId = randomUUID();
      const sellerId = randomUUID();
      const itemId = randomUUID();
      const quotedAmount = 100000n;

      const buyerWallet = await createTestWallet(buyerId, 200000n);
      const sellerWallet = await createTestWallet(sellerId, 0n);

      mockContentCatalogRpcPublisher.setQuote('RESOURCE_COLLECTION', itemId, {
        sellerId,
        priceInCents: quotedAmount,
        items: [
          {
            itemId,
            itemType: 'RESOURCE_COLLECTION',
            resourceIds: [],
          },
        ],
      });

      const response = await sendJson({
        method: 'POST',
        url: '/v1/billing/purchase',
        headers: {
          Authorization: `Bearer ${generateJWT(buyerId)}`,
          'x-user-id': buyerId,
        },
        payload: {
          itemType: 'RESOURCE_COLLECTION',
          itemId,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      const responseData = extractResponseData(response.body);
      expect(responseData.payableAmountInCents).toBe(quotedAmount.toString());

      const updatedBuyerWallet = await prisma.client.wallet.findUnique({
        where: { id: buyerWallet.id },
      });
      expect(updatedBuyerWallet?.balanceInCents).toBe(200000n - quotedAmount);

      const updatedSellerWallet = await prisma.client.wallet.findUnique({
        where: { id: sellerWallet.id },
      });
      expect(updatedSellerWallet?.balanceInCents).toBe(quotedAmount);

      const outboxRecord = await prisma.client.outbox.findFirst({
        where: { routingKey: 'PURCHASE_COMPLETED' },
      });
      expect(outboxRecord).toBeTruthy();
      expect(outboxRecord?.status).toBe('PENDING');
    });

    it('should reject purchase when buyer has insufficient balance', async () => {
      const buyerId = randomUUID();
      const sellerId = randomUUID();
      const itemId = randomUUID();

      const buyerWallet = await createTestWallet(buyerId, 50000n);
      const sellerWallet = await createTestWallet(sellerId, 0n);

      mockContentCatalogRpcPublisher.setQuote('RESOURCE', itemId, {
        sellerId,
        priceInCents: 100000n,
        items: [
          {
            itemId,
            itemType: 'RESOURCE',
            resourceIds: [itemId],
          },
        ],
      });

      const response = await sendJson({
        method: 'POST',
        url: '/v1/billing/purchase',
        headers: {
          Authorization: `Bearer ${generateJWT(buyerId)}`,
          'x-user-id': buyerId,
        },
        payload: {
          itemType: 'RESOURCE',
          itemId,
        },
      });

      expect(response.status).toBe(400);
      expect(extractErrorMessage(response.body)).toContain('Insufficient wallet balance');

      const updatedBuyerWallet = await prisma.client.wallet.findUnique({
        where: { id: buyerWallet.id },
      });
      expect(updatedBuyerWallet?.balanceInCents).toBe(50000n);

      const updatedSellerWallet = await prisma.client.wallet.findUnique({
        where: { id: sellerWallet.id },
      });
      expect(updatedSellerWallet?.balanceInCents).toBe(0n);

      const outboxRecords = await prisma.client.outbox.findMany({
        where: { routingKey: 'PURCHASE_COMPLETED' },
      });
      expect(outboxRecords).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 4: PRE-PURCHASE VALIDATION
  // ─────────────────────────────────────────────────────────────────

  describe('PRE-PURCHASE VALIDATION', () => {
    it('should return 400 when item was already purchased by user', async () => {
      const buyerId = randomUUID();
      const sellerId = randomUUID();
      const resourceId = randomUUID();

      const buyerWallet = await createTestWallet(buyerId, 150000n);
      await createTestWallet(sellerId, 0n);
      mockContentCatalogRpcPublisher.setQuote('RESOURCE', resourceId, {
        sellerId,
        priceInCents: 100000n,
        items: [
          {
            itemId: resourceId,
            itemType: 'RESOURCE',
            resourceIds: [resourceId],
          },
        ],
      });

      await createTestTransaction(
        buyerWallet.id,
        buyerId,
        'PURCHASE_DEBIT',
        'SUCCESS',
        100000n,
        `${randomUUID()}-debit`,
        {
          itemType: 'RESOURCE',
          itemId: resourceId,
        },
      );

      const response = await sendJson({
        method: 'POST',
        url: '/v1/billing/purchase',
        headers: {
          Authorization: 'Bearer ignored-by-test-guard',
          'x-user-id': buyerId,
        },
        payload: {
          itemType: 'RESOURCE',
          itemId: resourceId,
        },
      });

      expect(response.status).toBe(400);
      expect(extractErrorMessage(response.body)).toContain('already purchased');

      const outboxRecords = await prisma.client.outbox.findMany({
        where: { routingKey: 'PURCHASE_COMPLETED' },
      });
      expect(outboxRecords).toHaveLength(0);
    });

    it('should return 400 when content is not found or deleted in content-service', async () => {
      const buyerId = randomUUID();
      const sellerId = randomUUID();
      const tutorialId = randomUUID();

      await createTestWallet(buyerId, 200000n);
      await createTestWallet(sellerId, 0n);

      mockContentValidator.markInvalid('TUTORIAL', tutorialId);

      const response = await sendJson({
        method: 'POST',
        url: '/v1/billing/purchase',
        headers: {
          Authorization: 'Bearer ignored-by-test-guard',
          'x-user-id': buyerId,
        },
        payload: {
          itemType: 'TUTORIAL',
          itemId: tutorialId,
        },
      });

      expect(response.status).toBe(400);
      expect(extractErrorMessage(response.body)).toContain('not found or has been deleted');

      const buyerWalletAfter = await prisma.client.wallet.findUnique({
        where: { userId: buyerId },
      });
      expect(buyerWalletAfter?.balanceInCents).toBe(200000n);

      const outboxRecords = await prisma.client.outbox.findMany({
        where: { routingKey: 'PURCHASE_COMPLETED' },
      });
      expect(outboxRecords).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // TEST SUITE 5: CONCURRENT SCENARIO TESTS
  // ─────────────────────────────────────────────────────────────────

  describe('CONCURRENT & EDGE CASE SCENARIOS', () => {
    it('should handle idempotent webhook callbacks (duplicate webhook)', async () => {
      // ─ SETUP ─────────────────────────────────────────────────────
      const userId = randomUUID();
      const topupAmount = 100000n;
      const externalRef = `ext_${randomUUID()}`;

      const wallet = await createTestWallet(userId, 0n);
      await createTestTransaction(wallet.id, userId, 'TOP_UP', 'PENDING', topupAmount, externalRef);

      // ─ ACTION 1: First webhook call ──────────────────────────────
      const response1 = await sendJson({
        method: 'POST',
        url: '/v1/webhooks/billing/payos',
        headers: {
          'x-external-ref': externalRef,
          'x-amount': topupAmount.toString(),
        },
        payload: {
          id: externalRef,
          amount: topupAmount.toString(),
          status: 'COMPLETED',
        },
      });

      expect(response1.status).toBe(200);

      // Verify wallet was credited
      const wallet1 = await prisma.client.wallet.findUnique({ where: { id: wallet.id } });
      expect(wallet1?.balanceInCents).toBe(topupAmount);

      // ─ ACTION 2: Second (duplicate) webhook call ─────────────────
      const response2 = await sendJson({
        method: 'POST',
        url: '/v1/webhooks/billing/payos',
        headers: {
          'x-external-ref': externalRef,
          'x-amount': topupAmount.toString(),
        },
        payload: {
          id: externalRef,
          amount: topupAmount.toString(),
          status: 'COMPLETED',
        },
      });

      // ─ ASSERTIONS ────────────────────────────────────────────────
      // Should still return 200 (idempotent)
      expect(response2.status).toBe(200);

      // Balance should NOT double (idempotent - already SUCCESS)
      const wallet2 = await prisma.client.wallet.findUnique({ where: { id: wallet.id } });
      expect(wallet2?.balanceInCents).toBe(topupAmount); // Still 100,000, not 200,000

      // Should have only one WALLET_TOPPED_UP outbox event (idempotent)
      const outboxRecords = await prisma.client.outbox.findMany({
        where: { routingKey: 'WALLET_TOPPED_UP' },
      });
      expect(outboxRecords.length).toBeLessThanOrEqual(1);
    });

    // TODO: Re-enable after Prisma client regeneration
    // it('should correctly calculate bundle pricing with multiple resource types', async () => {
    // });
  });
});
