import { IQuery } from '@nestjs/cqrs';

/** CQRS Query to get resource collection by slug for library. */
export class GetLibraryResourceCollectionBySlugQuery implements IQuery {
  constructor(public readonly slug: string) {}
}
