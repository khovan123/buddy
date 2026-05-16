/** CQRS Query for retrieving a resource by its MongoDB ObjectId. */
export class GetResourceByIdQuery {
  constructor(public readonly id: string) {}
}
