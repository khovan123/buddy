import { IQuery } from '@nestjs/cqrs';

/** CQRS Query to get resources for library. */
export class GetLibraryResourcesQuery implements IQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly search?: string,
    public readonly userId?: string,
  ) {}
}
