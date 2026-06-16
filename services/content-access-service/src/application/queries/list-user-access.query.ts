import { IQuery } from '@nestjs/cqrs';

export class ListUserAccessQuery implements IQuery {
  constructor(public readonly userId: string) {}
}
