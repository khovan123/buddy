/** CQRS Query for retrieving  get top resource collections data. */
export class GetTopResourceCollectionsQuery {
  constructor(
    public readonly limit: number = 3,
    public readonly search?: string,
    public readonly semester?: number,
    public readonly majorId?: string,
  ) {}
}
