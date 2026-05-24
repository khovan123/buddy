/** CQRS Query for retrieving public auth verification state for a user. */
export class GetUserVerificationQuery {
  constructor(public readonly userId: string) {}
}
