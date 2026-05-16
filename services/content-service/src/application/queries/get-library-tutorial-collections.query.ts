import { IQuery } from '@nestjs/cqrs';

/** CQRS Query to get tutorial collections for library. */
export class GetLibraryTutorialCollectionsQuery implements IQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly search?: string,
    public readonly userId?: string,
  ) {}
}
