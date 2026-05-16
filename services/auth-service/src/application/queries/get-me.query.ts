/** CQRS Query for retrieving  get me data. */
export class GetMeQuery {
  constructor(public readonly userId: string) {}
}
