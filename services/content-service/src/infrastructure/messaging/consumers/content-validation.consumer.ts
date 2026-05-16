import { AppLogger, EXCHANGES, QUEUES } from '@libs/common';
import { CONTENT_ROUTINGKEYS, ContentValidationItemType } from '@libs/contracts';
import { Controller, Inject } from '@nestjs/common';
import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import type { ICollectionRepository } from '../../../domain/repositories/collection.repository.interface';
import type { IResourceRepository } from '../../../domain/repositories/resource.repository.interface';
import {
  COLLECTION_REPOSITORY,
  RESOURCE_REPOSITORY,
  TUTORIAL_REPOSITORY,
} from '../../../domain/repositories/tokens';
import type { ITutorialRepository } from '../../../domain/repositories/tutorial.repository.interface';
import { CollectionType } from '../../persistence/mongo/schemas/collection.schema';

type ValidateContentStatusPayload = {
  itemId: string;
  itemType: ContentValidationItemType;
};

type ValidateContentStatusRpcMessage = {
  payload?: ValidateContentStatusPayload;
  correlationId?: string;
};

type ValidateContentStatusResponse = {
  isValid: boolean;
};

/** Represents the  content validation consumer component. */
@Controller()
export class ContentValidationConsumer {
  private readonly logger = new AppLogger(ContentValidationConsumer.name);

  constructor(
    @Inject(RESOURCE_REPOSITORY)
    private readonly resourceRepository: IResourceRepository,
    @Inject(TUTORIAL_REPOSITORY)
    private readonly tutorialRepository: ITutorialRepository,
    @Inject(COLLECTION_REPOSITORY)
    private readonly collectionRepository: ICollectionRepository,
  ) {}

  /**
   * Executes the handle validate content status operation.
   *
   * @param message - The message parameter
   * @returns Result of type Promise<ValidateContentStatusResponse>
   */
  @RabbitRPC({
    exchange: EXCHANGES.CONTENT,
    routingKey: CONTENT_ROUTINGKEYS.VALIDATE_CONTENT_STATUS,
    queue: QUEUES.CONTENT_COMMANDS,
    queueOptions: {
      durable: true,
      arguments: { 'x-dead-letter-exchange': EXCHANGES.DEAD_LETTER },
    },
  })
  async handleValidateContentStatus(
    message: ValidateContentStatusRpcMessage | ValidateContentStatusPayload,
  ): Promise<ValidateContentStatusResponse> {
    const payload = this.extractPayload(message);
    const isValid = await this.validateContentStatus(payload.itemId, payload.itemType);

    this.logger.log(
      `Handled ${CONTENT_ROUTINGKEYS.VALIDATE_CONTENT_STATUS} for ${payload.itemType}:${payload.itemId} => isValid=${isValid}`,
    );

    return { isValid };
  }

  /**
   * Executes the extract payload operation.
   *
   * @param message - The message parameter
   * @returns Result of type ValidateContentStatusPayload
   */
  private extractPayload(
    message: ValidateContentStatusRpcMessage | ValidateContentStatusPayload,
  ): ValidateContentStatusPayload {
    if ('payload' in message && message.payload) {
      return message.payload;
    }

    return message as ValidateContentStatusPayload;
  }

  /**
   * Executes the validate content status operation.
   *
   * @param itemId - The itemId parameter
   * @param itemType - The itemType parameter
   * @returns Result of type Promise<boolean>
   */
  private async validateContentStatus(
    itemId: string,
    itemType: ContentValidationItemType,
  ): Promise<boolean> {
    switch (itemType) {
      case 'RESOURCE': {
        const resource = await this.resourceRepository.findById(itemId);
        return Boolean(resource && !resource.deletedAt);
      }
      case 'TUTORIAL': {
        const tutorial = await this.tutorialRepository.findById(itemId);
        return Boolean(tutorial && !tutorial.deletedAt);
      }
      case 'RESOURCE_COLLECTION': {
        const collection = await this.collectionRepository.findById(itemId);
        return Boolean(
          collection && !collection.deletedAt && collection.type === CollectionType.RESOURCE,
        );
      }
      case 'TUTORIAL_COLLECTION': {
        const collection = await this.collectionRepository.findById(itemId);
        return Boolean(
          collection && !collection.deletedAt && collection.type === CollectionType.TUTORIAL,
        );
      }
      case 'TUTORIAL_BUNDLE': {
        const tutorial = await this.tutorialRepository.findById(itemId);
        return Boolean(tutorial && !tutorial.deletedAt);
      }
      case 'TUTORIAL_BUNDLE_COLLECTION': {
        const collection = await this.collectionRepository.findById(itemId);
        return Boolean(
          collection && !collection.deletedAt && collection.type === CollectionType.TUTORIAL,
        );
      }
      default:
        return false;
    }
  }
}
