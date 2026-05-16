/** CQRS Query for retrieving multiple resources by their MongoDB ObjectIds. */
export class GetResourcesByIdsQuery {
  constructor(public readonly ids: string[]) {}
}
