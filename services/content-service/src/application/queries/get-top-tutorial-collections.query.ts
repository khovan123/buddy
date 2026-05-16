/** CQRS Query for retrieving  get top tutorial collections data. */
export class GetTopTutorialCollectionsQuery {
  constructor(
    public readonly limit: number = 3,
    public readonly search?: string,
    public readonly semester?: number,
    public readonly majorId?: string,
  ) {}
}
