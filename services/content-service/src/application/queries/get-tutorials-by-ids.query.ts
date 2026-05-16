/** CQRS Query for retrieving multiple tutorials by their MongoDB ObjectIds. */
export class GetTutorialsByIdsQuery {
  constructor(public readonly ids: string[]) {}
}
