import { BadRequestException } from '@nestjs/common';

/** Represents the  content not found or deleted exception component. */
export class ContentNotFoundOrDeletedException extends BadRequestException {
  constructor(itemType: string, itemId: string) {
    super(`Content ${itemType}:${itemId} was not found or has been deleted`);
  }
}
