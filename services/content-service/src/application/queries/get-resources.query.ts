/** CQRS Query for retrieving  get resources data. */
export class GetResourcesQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly search?: string,
    public readonly userId?: string,
    public readonly semester?: number,
    public readonly majorId?: string,
  ) {}
}
