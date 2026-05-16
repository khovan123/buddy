/** CQRS Query for retrieving multiple collections by their MongoDB ObjectIds. */
export class GetCollectionsByIdsQuery {
  constructor(public readonly ids: string[]) {}
}
