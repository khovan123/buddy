/** CQRS Query for retrieving a collection by its MongoDB ObjectId. */
export class GetCollectionByIdQuery {
  constructor(public readonly id: string) {}
}
