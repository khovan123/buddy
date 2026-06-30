import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  AppLogger,
  EXCHANGES,
  RABBITMQ_DEFAULT_TIMEOUT_MS,
  RABBITMQ_CONNECTION,
  attachTraceContextToMessage,
  ensureCorrelationId,
  getCorrelationId,
} from '@libs/common';
import { ContentValidationItemType, ValidateContentStatusEvent } from '@libs/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { IContentValidator } from '../../../domain/services/content-validator.interface';

type ValidateContentStatusResponse = {
  isValid: boolean;
};

/** Represents the  content validation rpc publisher component. */
@Injectable()
export class ContentValidationRpcPublisher implements IContentValidator {
  private readonly logger = new AppLogger(ContentValidationRpcPublisher.name);

  constructor(
    @Inject(RABBITMQ_CONNECTION)
    private readonly amqpConnection: AmqpConnection,
  ) {}

  async validateContentStatus(
    itemId: string,
    itemType: ContentValidationItemType,
  ): Promise<boolean> {
    const event = new ValidateContentStatusEvent({ itemId, itemType });

    const response = await this.amqpConnection.request<ValidateContentStatusResponse>({
      exchange: EXCHANGES.CONTENT,
      routingKey: event.routingKey,
      payload: this.toMessageData(event),
      timeout: RABBITMQ_DEFAULT_TIMEOUT_MS,
    });

    return response.isValid;
  }

  private toMessageData(event: ValidateContentStatusEvent) {
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
