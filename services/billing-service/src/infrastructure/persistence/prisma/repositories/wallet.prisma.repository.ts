import { EXCHANGES, OUTBOX_EVENTS } from '@libs/common';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { ProductType } from '../../../../application/commands/process-purchase.command';
import { Wallet } from '../../../../domain/entities/wallet.entity';
import {
  IWalletRepository,
  PurchaseTransferInput,
  type PayoutAccountRecord,
  type SubscriptionRecord,
} from '../../../../domain/repositories/wallet.repository.interface';
import type { Prisma } from '../generated/client';
import { PrismaService } from '../prisma.service';

/** Repository interface/implementation for  wallet prisma data access. */
@Injectable()
export class WalletPrismaRepository implements IWalletRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Executes the get or create wallet by user id operation.
   *
   * @param userId - The userId parameter
   * @returns Result of type Promise<Wallet>
   */
  async getOrCreateWalletByUserId(userId: string): Promise<Wallet> {
    const wallet = await this.prisma.client.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    return new Wallet(wallet.id, wallet.userId, wallet.balanceInCents);
  }

  /**
   * Executes the create pending top up operation.
   *
   * @param input - The input parameter
   * @returns Result of type Promise<{ transactionId: string; walletId: string }>
   */
  async createPendingTopUp(input: {
    userId: string;
    amountInCents: bigint;
    provider: 'SEPAY';
    externalReference: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ transactionId: string; walletId: string }> {
    const wallet = await this.prisma.client.wallet.upsert({
      where: { userId: input.userId },
      update: {},
      create: { userId: input.userId },
    });

    const transaction = await this.prisma.client.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: input.userId,
        type: 'TOP_UP',
        status: 'PENDING',
        provider: input.provider,
        amountInCents: input.amountInCents,
        externalRef: input.externalReference,
        metadata: (input.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    return { transactionId: transaction.id, walletId: wallet.id };
  }

  /**
   * Executes the confirm top up and insert outbox operation.
   *
   * @param input - The input parameter
   * @returns Result of type Promise<{ transactionId: string; userId: string; walletId: string }>
   */
  async confirmTopUpAndInsertOutbox(input: {
    externalReference: string;
    provider: 'SEPAY';
    amountInCents: bigint;
    eventType: string;
    eventPayload: Record<string, unknown>;
    correlationId: string;
  }): Promise<{ transactionId: string; userId: string; walletId: string }> {
    const result = await this.prisma.client.$transaction(async (tx) => {
      const transaction = await tx.walletTransaction.findFirst({
        where: {
          provider: input.provider,
          OR: [
            { externalRef: input.externalReference },
            {
              metadata: {
                path: ['orderCode'],
                equals: input.externalReference,
              },
            },
          ],
        },
      });

      if (!transaction) {
        throw new NotFoundException('Top-up transaction was not found');
      }

      if (transaction.status === 'SUCCESS') {
        return {
          transactionId: transaction.id,
          userId: transaction.userId,
          walletId: transaction.walletId,
        };
      }

      if (transaction.status !== 'PENDING') {
        throw new BadRequestException('Top-up transaction cannot be confirmed from current state');
      }

      if (transaction.amountInCents !== input.amountInCents) {
        throw new BadRequestException('Webhook amount does not match transaction amount');
      }

      await tx.wallet.update({
        where: { id: transaction.walletId },
        data: {
          balanceInCents: {
            increment: input.amountInCents,
          },
        },
      });

      await tx.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          confirmedAt: new Date(),
        },
      });

      await tx.outbox.create({
        data: {
          correlationId: input.correlationId,
          type: input.eventType,
          payload: this.withTopUpIdentifiers(input.eventPayload, {
            transactionId: transaction.id,
            userId: transaction.userId,
            walletId: transaction.walletId,
          }) as Prisma.InputJsonValue,
          exchange: EXCHANGES.BILLING,
          routingKey: input.eventType,
          status: 'PENDING',
          occurredAt: new Date(),
          retryCount: 0,
        },
      });

      return {
        transactionId: transaction.id,
        userId: transaction.userId,
        walletId: transaction.walletId,
      };
    });

    // Transaction committed → trigger relay immediately
    this.eventEmitter.emit(OUTBOX_EVENTS.FLUSHED);

    return result;
  }

  /**
   * Executes the find owned resource ids operation.
   *
   * @param userId - The userId parameter
   * @returns Result of type Promise<Set<string>>
   */
  async findOwnedResourceIds(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.client.userResourceOwnership.findMany({
      where: { userId },
      select: { resourceId: true },
    });

    return new Set(rows.map((row) => row.resourceId));
  }

  /**
   * Executes the find successful purchased item ids operation.
   *
   * @param userId - The userId parameter
   * @param itemType - The itemType parameter
   * @returns Result of type Promise<Set<string>>
   */
  async findSuccessfulPurchasedItemIds(
    userId: string,
    itemType: ProductType,
  ): Promise<Set<string>> {
    const rows = await this.prisma.client.walletTransaction.findMany({
      where: {
        userId,
        type: 'PURCHASE_DEBIT',
        status: 'SUCCESS',
      },
      select: { metadata: true },
    });

    const purchasedItemIds = new Set<string>();

    for (const row of rows) {
      const metadata = row.metadata as Record<string, unknown> | null;
      if (!metadata) {
        continue;
      }

      if (metadata.itemType === itemType) {
        this.addStringId(purchasedItemIds, metadata.itemId);
      }

      if (!Array.isArray(metadata.items)) {
        continue;
      }

      for (const item of metadata.items) {
        if (!item || typeof item !== 'object') {
          continue;
        }

        const purchasedItem = item as Record<string, unknown>;
        if (itemType === 'RESOURCE') {
          this.addStringIds(purchasedItemIds, purchasedItem.resourceIds);
        }
        if (itemType === 'TUTORIAL') {
          this.addStringId(purchasedItemIds, purchasedItem.tutorialId);
          this.addStringIds(purchasedItemIds, purchasedItem.tutorialIds);
        }
      }
    }

    return purchasedItemIds;
  }

  /**
   * Executes the has successful purchase of item operation.
   *
   * @param input - The input parameter
   * @returns Result of type Promise<boolean>
   */
  async hasSuccessfulPurchaseOfItem(input: {
    userId: string;
    itemId: string;
    itemType: ProductType;
  }): Promise<boolean> {
    const rows = await this.prisma.client.walletTransaction.findMany({
      where: {
        userId: input.userId,
        type: 'PURCHASE_DEBIT',
        status: 'SUCCESS',
      },
      select: { metadata: true },
    });

    return rows.some((row) => {
      const metadata = row.metadata as Record<string, unknown> | null;
      if (!metadata) {
        return false;
      }

      return metadata.itemId === input.itemId && metadata.itemType === input.itemType;
    });
  }

  /**
   * Executes the transfer for purchase and insert outbox operation.
   *
   * @param input - The input parameter
   * @returns Result of type Promise<{ purchaseId: string }>
   */
  async transferForPurchaseAndInsertOutbox(
    input: PurchaseTransferInput,
  ): Promise<{ purchaseId: string }> {
    const result = await this.prisma.client.$transaction(async (tx) => {
      const buyerWallet = await tx.wallet.upsert({
        where: { userId: input.buyerId },
        update: {},
        create: { userId: input.buyerId },
      });

      const sellerWallet = await tx.wallet.upsert({
        where: { userId: input.sellerId },
        update: {},
        create: { userId: input.sellerId },
      });

      if (input.amountInCents > 0n && buyerWallet.balanceInCents < input.amountInCents) {
        throw new BadRequestException('Insufficient wallet balance for this purchase');
      }

      const purchaseId = randomUUID();

      if (input.amountInCents > 0n) {
        await tx.wallet.update({
          where: { id: buyerWallet.id },
          data: {
            balanceInCents: {
              decrement: input.amountInCents,
            },
          },
        });

        await tx.wallet.update({
          where: { id: sellerWallet.id },
          data: {
            balanceInCents: {
              increment: input.amountInCents,
            },
          },
        });
      }

      await tx.walletTransaction.createMany({
        data: [
          {
            walletId: buyerWallet.id,
            userId: input.buyerId,
            type: 'PURCHASE_DEBIT',
            status: 'SUCCESS',
            amountInCents: input.amountInCents,
            currency: 'VND',
            externalRef: `${purchaseId}-debit`,
            idempotencyKey: input.idempotencyKey ? `${input.idempotencyKey}-debit` : null,
            metadata: {
              itemType: input.itemType,
              itemId: input.itemId,
              items: input.purchasedItems,
              purchaseId,
              amountInCents: input.amountInCents.toString(),
            } as Prisma.InputJsonValue,
            confirmedAt: new Date(),
          },
          {
            walletId: sellerWallet.id,
            userId: input.sellerId,
            type: 'PURCHASE_CREDIT',
            status: 'SUCCESS',
            amountInCents: input.amountInCents,
            currency: 'VND',
            externalRef: `${purchaseId}-credit`,
            idempotencyKey: input.idempotencyKey ? `${input.idempotencyKey}-credit` : null,
            metadata: {
              itemType: input.itemType,
              itemId: input.itemId,
              buyerId: input.buyerId,
            } as Prisma.InputJsonValue,
            confirmedAt: new Date(),
          },
        ],
      });

      await tx.outbox.create({
        data: {
          correlationId: input.correlationId,
          type: input.eventType,
          payload: this.withPurchaseIdentifier(
            input.eventPayload,
            purchaseId,
          ) as Prisma.InputJsonValue,
          exchange: EXCHANGES.BILLING,
          routingKey: input.eventType,
          status: 'PENDING',
          occurredAt: new Date(),
          retryCount: 0,
        },
      });

      return { purchaseId };
    });

    // Transaction committed → trigger relay immediately
    this.eventEmitter.emit(OUTBOX_EVENTS.FLUSHED);

    return result;
  }

  /**
   * Executes the with top up identifiers operation.
   *
   * @param eventPayload - The eventPayload parameter
   * @param ids - The ids parameter
   * @returns Result of type Record<string, unknown>
   */
  private withTopUpIdentifiers(
    eventPayload: Record<string, unknown>,
    ids: {
      transactionId: string;
      userId: string;
      walletId: string;
    },
  ): Record<string, unknown> {
    const cloned = structuredClone(eventPayload);
    const payload = (cloned.payload || {}) as Record<string, unknown>;

    payload.transactionId = ids.transactionId;
    payload.userId = ids.userId;
    payload.walletId = ids.walletId;
    cloned.payload = payload;

    return cloned;
  }

  /**
   * Executes the with purchase identifier operation.
   *
   * @param eventPayload - The eventPayload parameter
   * @param purchaseId - The purchaseId parameter
   * @returns Result of type Record<string, unknown>
   */
  private withPurchaseIdentifier(
    eventPayload: Record<string, unknown>,
    purchaseId: string,
  ): Record<string, unknown> {
    const cloned = structuredClone(eventPayload);
    const payload = (cloned.payload || {}) as Record<string, unknown>;

    payload.purchaseId = purchaseId;
    cloned.payload = payload;

    return cloned;
  }

  private addStringId(ids: Set<string>, value: unknown): void {
    if (typeof value === 'string' && value.length > 0) {
      ids.add(value);
    }
  }

  private addStringIds(ids: Set<string>, value: unknown): void {
    if (!Array.isArray(value)) {
      return;
    }

    value.forEach((item) => this.addStringId(ids, item));
  }

  async createPendingWithdraw(input: {
    userId: string;
    amountInCents: bigint;
    provider: 'SEPAY' | 'BANK_TRANSFER';
    metadata?: Record<string, unknown>;
    idempotencyKey?: string;
  }): Promise<{ transactionId: string }> {
    const wallet = await this.prisma.client.wallet.upsert({
      where: { userId: input.userId },
      update: {},
      create: { userId: input.userId },
    });

    const transaction = await this.prisma.client.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId: input.userId,
        type: 'WITHDRAW',
        status: 'PENDING',
        provider: input.provider,
        amountInCents: input.amountInCents,
        idempotencyKey: input.idempotencyKey,
        metadata: (input.metadata || {}) as Prisma.InputJsonValue,
      },
    });

    return { transactionId: transaction.id };
  }

  async confirmWithdrawAndInsertOutbox(input: {
    transactionId: string;
    eventType: string;
    eventPayload: Record<string, unknown>;
    correlationId: string;
  }): Promise<{ transactionId: string; userId: string }> {
    const result = await this.prisma.client.$transaction(async (tx) => {
      const transaction = await tx.walletTransaction.findUnique({
        where: { id: input.transactionId },
      });

      if (!transaction) {
        throw new NotFoundException('Withdraw transaction was not found');
      }

      if (transaction.status === 'SUCCESS') {
        return {
          transactionId: transaction.id,
          userId: transaction.userId,
        };
      }

      if (transaction.status !== 'PENDING') {
        throw new BadRequestException(
          'Withdraw transaction cannot be confirmed from current state',
        );
      }

      const wallet = await tx.wallet.findUnique({
        where: { id: transaction.walletId },
      });

      if (!wallet || wallet.balanceInCents < transaction.amountInCents) {
        throw new BadRequestException('Insufficient wallet balance for this withdrawal');
      }

      await tx.wallet.update({
        where: { id: transaction.walletId },
        data: {
          balanceInCents: {
            decrement: transaction.amountInCents,
          },
        },
      });

      await tx.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          confirmedAt: new Date(),
        },
      });

      await tx.outbox.create({
        data: {
          correlationId: input.correlationId,
          type: input.eventType,
          payload: input.eventPayload as Prisma.InputJsonValue,
          exchange: EXCHANGES.BILLING,
          routingKey: input.eventType,
          status: 'PENDING',
          occurredAt: new Date(),
          retryCount: 0,
        },
      });

      return {
        transactionId: transaction.id,
        userId: transaction.userId,
      };
    });

    // Transaction committed → trigger relay immediately
    this.eventEmitter.emit(OUTBOX_EVENTS.FLUSHED);

    return result;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<{
    transactionId: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    metadata: Record<string, unknown> | null;
  } | null> {
    const transaction = await this.prisma.client.walletTransaction.findFirst({
      where: {
        idempotencyKey: {
          in: [idempotencyKey, `${idempotencyKey}-debit`],
        },
      },
    });

    if (!transaction) {
      return null;
    }

    return {
      transactionId: transaction.id,
      status: transaction.status,
      metadata: transaction.metadata as Record<string, unknown> | null,
    };
  }

  // ── Creator Stats ──────────────────────────────────────────────────

  async countSuccessfulSales(sellerId: string): Promise<number> {
    return this.prisma.client.walletTransaction.count({
      where: { userId: sellerId, type: 'PURCHASE_CREDIT', status: 'SUCCESS' },
    });
  }

  // ── CQRS Read-side ─────────────────────────────────────────────────

  async findTransactionsByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    data: import('../../../../domain/repositories/wallet.repository.interface').TransactionRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.client.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.client.walletTransaction.count({ where: { userId } }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        type: row.type,
        status: row.status,
        provider: row.provider,
        amountInCents: row.amountInCents.toString(),
        currency: row.currency,
        createdAt: row.createdAt,
        confirmedAt: row.confirmedAt,
        metadata: row.metadata as Record<string, unknown> | null,
      })),
      total,
      page,
      limit,
    };
  }

  async findTransactionById(
    transactionId: string,
  ): Promise<
    import('../../../../domain/repositories/wallet.repository.interface').TransactionRecord | null
  > {
    const row = await this.prisma.client.walletTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!row) return null;

    return {
      id: row.id,
      type: row.type,
      status: row.status,
      provider: row.provider,
      amountInCents: row.amountInCents.toString(),
      currency: row.currency,
      createdAt: row.createdAt,
      confirmedAt: row.confirmedAt,
      metadata: row.metadata as Record<string, unknown> | null,
    };
  }

  // ── Payout Account ────────────────────────────────────────────────

  async upsertPayoutAccount(input: {
    userId: string;
    bankBin: string;
    bankAccountNumber: string;
    bankAccountName: string;
    bankName: string;
    verified: boolean;
    verifiedAt?: Date;
  }): Promise<PayoutAccountRecord> {
    const row = await this.prisma.client.payoutAccount.upsert({
      where: { userId: input.userId },
      update: {
        bankBin: input.bankBin,
        bankAccountNumber: input.bankAccountNumber,
        bankAccountName: input.bankAccountName,
        bankName: input.bankName,
        verified: input.verified,
        verifiedAt: input.verifiedAt ?? null,
      },
      create: {
        userId: input.userId,
        bankBin: input.bankBin,
        bankAccountNumber: input.bankAccountNumber,
        bankAccountName: input.bankAccountName,
        bankName: input.bankName,
        verified: input.verified,
        verifiedAt: input.verifiedAt ?? null,
      },
    });

    return {
      id: row.id,
      userId: row.userId,
      bankBin: row.bankBin,
      bankAccountNumber: row.bankAccountNumber,
      bankAccountName: row.bankAccountName,
      bankName: row.bankName,
      verified: row.verified,
      verifiedAt: row.verifiedAt,
    };
  }

  async findPayoutAccountByUserId(userId: string): Promise<PayoutAccountRecord | null> {
    const row = await this.prisma.client.payoutAccount.findUnique({
      where: { userId },
    });

    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      bankBin: row.bankBin,
      bankAccountNumber: row.bankAccountNumber,
      bankAccountName: row.bankAccountName,
      bankName: row.bankName,
      verified: row.verified,
      verifiedAt: row.verifiedAt,
    };
  }

  // ── Subscription ────────────────────────────────────────────────────

  async findActiveSubscription(userId: string): Promise<SubscriptionRecord | null> {
    const row = await this.prisma.client.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
    });

    if (!row) return null;

    return {
      id: row.id,
      userId: row.userId,
      plan: row.plan,
      status: row.status,
      startsAt: row.startsAt,
      expiresAt: row.expiresAt,
    };
  }

  async upsertSubscription(input: {
    userId: string;
    plan: string;
    expiresAt?: Date;
  }): Promise<SubscriptionRecord> {
    const row = await this.prisma.client.subscription.upsert({
      where: { userId: input.userId },
      update: {
        plan: input.plan as any,
        status: 'ACTIVE',
        startsAt: new Date(),
        expiresAt: input.expiresAt ?? null,
      },
      create: {
        userId: input.userId,
        plan: input.plan as any,
        status: 'ACTIVE',
        expiresAt: input.expiresAt ?? null,
      },
    });

    return {
      id: row.id,
      userId: row.userId,
      plan: row.plan,
      status: row.status,
      startsAt: row.startsAt,
      expiresAt: row.expiresAt,
    };
  }

  async cancelSubscription(userId: string): Promise<void> {
    await this.prisma.client.subscription.updateMany({
      where: { userId, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });
  }
}
