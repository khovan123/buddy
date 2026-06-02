import { BILLING_ROUTINGKEYS, PurchaseCompletedEvent } from '@libs/contracts';
import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ContentNotFoundOrDeletedException } from '../../../domain/exceptions/content-not-found-or-deleted.exception';
import { ItemAlreadyOwnedException } from '../../../domain/exceptions/item-already-owned.exception';
import type {
  IContentValidator,
  PurchasableContentType,
} from '../../../domain/services/content-validator.interface';
import { CONTENT_VALIDATOR, WALLET_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IWalletRepository } from '../../../domain/repositories/wallet.repository.interface';
import { ContentCatalogRpcPublisher } from '../../../infrastructure/messaging/publishers/content-catalog.rpc';
import { ProcessPurchaseCommand } from '../process-purchase.command';

/** CQRS Handler to execute  process purchase. */
@CommandHandler(ProcessPurchaseCommand)
export class ProcessPurchaseHandler implements ICommandHandler<ProcessPurchaseCommand> {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepository: IWalletRepository,
    @Inject(CONTENT_VALIDATOR)
    private readonly contentValidator: IContentValidator,
    private readonly contentCatalogRpcPublisher: ContentCatalogRpcPublisher,
  ) {}

  /**
   * Executes the execute operation.
   *
   * @param command - The command parameter
   * @returns Result of type Promise<{
   *     purchaseId: string;
   *     payableAmountInCents: string;
   *   }>
   */
  async execute(command: ProcessPurchaseCommand): Promise<{
    purchaseId: string;
    payableAmountInCents: string;
  }> {
    if (command.idempotencyKey) {
      const existing = await this.walletRepository.findByIdempotencyKey(command.idempotencyKey);
      if (existing) {
        if (existing.status === 'SUCCESS') {
          return {
            purchaseId: (existing.metadata?.purchaseId as string) || 'unknown',
            payableAmountInCents: (existing.metadata?.amountInCents as string) || '0',
          };
        }
        if (existing.status === 'PENDING') {
          throw new BadRequestException('Transaction is already being processed');
        }
        if (existing.status === 'FAILED') {
          throw new BadRequestException('Previous attempt with this idempotency key failed');
        }
      }
    }

    await this.validatePrePurchase(command);

    const [ownedResourceIds, ownedTutorialIds] = await Promise.all([
      this.walletRepository.findSuccessfulPurchasedItemIds(command.buyerId, 'RESOURCE'),
      this.walletRepository.findSuccessfulPurchasedItemIds(command.buyerId, 'TUTORIAL'),
    ]);

    const quote = await this.contentCatalogRpcPublisher.getPurchaseCatalog({
      itemId: command.itemId,
      itemType: command.itemType,
      userId: command.buyerId,
      ownedResourceIds: Array.from(ownedResourceIds),
      ownedTutorialIds: Array.from(ownedTutorialIds),
    });

    if (quote.priceInCents < 0n) {
      throw new BadRequestException('Computed payable amount is invalid');
    }

    const event = new PurchaseCompletedEvent(
      {
        purchaseId: '',
        buyerId: command.buyerId,
        sellerId: quote.sellerId,
        amount: quote.priceInCents.toString(),
        purchasedAt: new Date().toISOString(),
        items: quote.items,
      },
      command.correlationId,
    );

    const transferResult = await this.walletRepository.transferForPurchaseAndInsertOutbox({
      buyerId: command.buyerId,
      sellerId: quote.sellerId,
      amountInCents: quote.priceInCents,
      itemId: command.itemId,
      itemType: command.itemType,
      purchasedItems: quote.items,
      correlationId: command.correlationId,
      eventType: BILLING_ROUTINGKEYS.PURCHASE_COMPLETED,
      eventPayload: {
        eventId: event.eventId,
        routingKey: event.routingKey,
        version: event.version,
        occurredAt: event.occurredAt,
        correlationId: event.correlationId,
        causationId: event.causationId,
        payload: {
          ...event.payload,
          purchaseId: '',
        },
      },
      idempotencyKey: command.idempotencyKey,
    });

    return {
      purchaseId: transferResult.purchaseId,
      payableAmountInCents: quote.priceInCents.toString(),
    };
  }

  /**
   * Executes the validate pre purchase operation.
   *
   * @param command - The command parameter
   */
  private async validatePrePurchase(command: ProcessPurchaseCommand): Promise<void> {
    if (!this.isStrictValidationType(command.itemType)) {
      return;
    }

    const alreadyOwned = await this.walletRepository.hasSuccessfulPurchaseOfItem({
      userId: command.buyerId,
      itemId: command.itemId,
      itemType: command.itemType,
    });

    if (alreadyOwned) {
      throw new ItemAlreadyOwnedException(command.itemType, command.itemId);
    }

    const isValidContent = await this.contentValidator.validateContentStatus(
      command.itemId,
      command.itemType,
    );

    if (!isValidContent) {
      throw new ContentNotFoundOrDeletedException(command.itemType, command.itemId);
    }
  }

  /**
   * Executes the is strict validation type operation.
   *
   * @param itemType - The itemType parameter
   * @returns Result of type itemType is PurchasableContentType
   */
  private isStrictValidationType(itemType: string): itemType is PurchasableContentType {
    return (
      itemType === 'RESOURCE' ||
      itemType === 'TUTORIAL' ||
      itemType === 'RESOURCE_COLLECTION' ||
      itemType === 'TUTORIAL_COLLECTION' ||
      itemType === 'TUTORIAL_BUNDLE' ||
      itemType === 'TUTORIAL_BUNDLE_COLLECTION'
    );
  }
}
