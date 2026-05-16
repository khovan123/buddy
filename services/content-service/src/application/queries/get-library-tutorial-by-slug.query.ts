import { IQuery } from '@nestjs/cqrs';

/** CQRS Query to get tutorial by slug for library. */
export class GetLibraryTutorialBySlugQuery implements IQuery {
  constructor(public readonly slug: string) {}
}
