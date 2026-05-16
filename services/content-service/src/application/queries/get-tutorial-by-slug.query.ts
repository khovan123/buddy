/** CQRS Query for retrieving  get tutorial by slug data. */
export class GetTutorialBySlugQuery {
  constructor(public readonly slug: string) {}
}
