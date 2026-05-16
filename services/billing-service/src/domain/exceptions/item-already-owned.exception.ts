import { BadRequestException } from '@nestjs/common';

/** Represents the  item already owned exception component. */
export class ItemAlreadyOwnedException extends BadRequestException {
  constructor(itemType: string, itemId: string) {
    super(`Item ${itemType}:${itemId} was already purchased by this user`);
  }
}
