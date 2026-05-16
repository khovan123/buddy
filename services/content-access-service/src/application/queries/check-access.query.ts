export class CheckAccessQuery {
  constructor(
    public readonly userId: string,
    public readonly resourceId: string,
  ) {}
}
