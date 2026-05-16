import {
  AppLogger,
  EXCHANGES,
  attachTraceContextToMessage,
  ensureCorrelationId,
  getCorrelationId,
} from '@libs/common';
import {
  ContentPurchaseCatalogItemType,
  GetPurchaseCatalogEvent,
  PurchaseCatalogResponse,
  PurchasedItemPayload,
} from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

/** Represents the  content catalog rpc publisher component. */
@Injectable()
export class ContentCatalogRpcPublisher {
  private readonly logger = new AppLogger(ContentCatalogRpcPublisher.name);

  constructor(private readonly amqpConnection: AmqpConnection) {}

  async getPurchaseCatalog(input: {
    itemId: string;
    itemType: ContentPurchaseCatalogItemType;
    userId: string;
    ownedResourceIds?: string[];
    ownedTutorialIds?: string[];
  }): Promise<{
    sellerId: string;
    priceInCents: bigint;
    items: PurchasedItemPayload[];
  }> {
    const event = new GetPurchaseCatalogEvent({
      itemId: input.itemId,
      itemType: input.itemType,
      userId: input.userId,
      ownedResourceIds: input.ownedResourceIds,
      ownedTutorialIds: input.ownedTutorialIds,
    });

    const response = await this.amqpConnection.request<PurchaseCatalogResponse>({
      exchange: EXCHANGES.CONTENT,
      routingKey: event.routingKey,
      payload: this.toMessageData(event),
      timeout: 15_000,
    });

    return {
      ...response,
      priceInCents: BigInt(response.priceInCents),
    };
  }

  private toMessageData(event: GetPurchaseCatalogEvent) {
    const correlationId = ensureCorrelationId(
      event.correlationId,
      getCorrelationId(),
      event.eventId,
    );

    return attachTraceContextToMessage({
      eventId: event.eventId,
      routingKey: event.routingKey,
      version: event.version,
      occurredAt: event.occurredAt,
      correlationId,
      causationId: event.causationId,
      payload: event.payload,
    });
  }
}
