/** CQRS Query for retrieving  get resource by slug data. */
export class GetResourceBySlugQuery {
  constructor(public readonly slug: string) {}
}
