/** CQRS Query for retrieving  get tutorials data. */
export class GetTutorialsQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly search?: string,
    public readonly userId?: string,
    public readonly semester?: number,
    public readonly majorId?: string,
    public readonly courseId?: string,
    public readonly price?: 'free' | 'paid',
    public readonly verified?: boolean,
    public readonly sort?: 'newest' | 'popular' | 'rating',
  ) {}
}
