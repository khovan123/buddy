import { AppLogger } from '@libs/common';
import {
  GetUploadHistoryByContentEvent,
  ResourceUploadHistoryRpcResponseDto,
} from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { StorageBrokerPublisher } from '../../../infrastructure/messaging/publishers/storage-broker.rpc';
import { GetResourceUploadHistoryQuery } from '../get-resource-upload-history.query';

@QueryHandler(GetResourceUploadHistoryQuery)
@Injectable()
export class GetResourceUploadHistoryHandler implements IQueryHandler<GetResourceUploadHistoryQuery> {
  private readonly logger = new AppLogger(GetResourceUploadHistoryHandler.name);

  constructor(private readonly storageBrokerPublisher: StorageBrokerPublisher) {}

  async execute(
    query: GetResourceUploadHistoryQuery,
  ): Promise<ResourceUploadHistoryRpcResponseDto[]> {
    try {
      const event = new GetUploadHistoryByContentEvent({
        contentId: query.contentId,
      });
      const histories = await this.storageBrokerPublisher.getUploadHistoryByContent(event);
      return histories;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch resource upload history from upload-service: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }
}
