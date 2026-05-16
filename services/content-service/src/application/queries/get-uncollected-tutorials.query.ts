/** CQRS Query for retrieving tutorials not assigned to any collection. */
export class GetUncollectedTutorialsQuery {
  constructor(
    public readonly courseId: string,
    public readonly limit: number = 100,
  ) {}
}
