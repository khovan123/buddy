import { IQuery } from '@nestjs/cqrs';

/** CQRS Query to get tutorials by user id. */
export class GetTutorialsByUserQuery implements IQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly search?: string,
    public readonly userId?: string,
  ) {}
}
