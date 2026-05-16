import { AppLogger } from '@libs/common';
import {
  GetUploadHistoryByContentEvent,
  TutorialUploadHistoryRpcResponseDto,
} from '@libs/contracts';
import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { StorageBrokerPublisher } from '../../../infrastructure/messaging/publishers/storage-broker.rpc';
import { GetTutorialUploadHistoryQuery } from '../get-tutorial-upload-history.query';

@QueryHandler(GetTutorialUploadHistoryQuery)
@Injectable()
export class GetTutorialUploadHistoryHandler implements IQueryHandler<GetTutorialUploadHistoryQuery> {
  private readonly logger = new AppLogger(GetTutorialUploadHistoryHandler.name);

  constructor(private readonly storageBrokerPublisher: StorageBrokerPublisher) {}

  async execute(
    query: GetTutorialUploadHistoryQuery,
  ): Promise<TutorialUploadHistoryRpcResponseDto[]> {
    try {
      const event = new GetUploadHistoryByContentEvent({
        contentId: query.contentId,
      });
      const histories = await this.storageBrokerPublisher.getUploadHistoryByContent(event);
      return histories;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch tutorial upload history from upload-service: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }
}
