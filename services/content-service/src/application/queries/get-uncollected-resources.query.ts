/** CQRS Query for retrieving resources not assigned to any collection. */
export class GetUncollectedResourcesQuery {
  constructor(
    public readonly courseId: string,
    public readonly limit: number = 100,
  ) {}
}
