/** CQRS Query for retrieving  get user by id data. */
export class GetUserByIdQuery {
  constructor(public readonly userId: string) {}
}
