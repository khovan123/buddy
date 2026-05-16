/** CQRS Query for retrieving  get top resources data. */
export class GetTopResourcesQuery {
  constructor(
    public readonly limit: number = 6,
    public readonly search?: string,
    public readonly semester?: number,
    public readonly majorId?: string,
  ) {}
}
