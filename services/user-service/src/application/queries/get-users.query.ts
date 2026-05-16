/** CQRS Query for retrieving  get users data. */
export class GetUsersQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly search?: string,
    public readonly isActive?: boolean,
  ) {}
}
