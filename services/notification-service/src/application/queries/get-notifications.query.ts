/** CQRS Query for retrieving  get notifications data. */
export class GetNotificationsQuery {
  constructor(
    public readonly userId: string,
    public readonly limit?: number,
  ) {}
}
