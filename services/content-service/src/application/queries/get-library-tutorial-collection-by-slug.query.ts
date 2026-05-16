import { IQuery } from '@nestjs/cqrs';

/** CQRS Query to get tutorial collection by slug for library. */
export class GetLibraryTutorialCollectionBySlugQuery implements IQuery {
  constructor(public readonly slug: string) {}
}
