/** CQRS Query for retrieving my resources data. */
export class GetMyResourcesQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly search?: string,
    public readonly userId?: string,
  ) {}
}
