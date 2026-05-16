/** CQRS Query for retrieving a tutorial by its MongoDB ObjectId. */
export class GetTutorialByIdQuery {
  constructor(public readonly id: string) {}
}
