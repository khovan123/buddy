import { IQuery } from '@nestjs/cqrs';

/** CQRS Query to get resource by slug for library. */
export class GetLibraryResourceBySlugQuery implements IQuery {
  constructor(public readonly slug: string) {}
}
