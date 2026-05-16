/** CQRS Query for retrieving  get top tutorials data. */
export class GetTopTutorialsQuery {
  constructor(
    public readonly limit: number = 6,
    public readonly search?: string,
    public readonly semester?: number,
    public readonly majorId?: string,
  ) {}
}
