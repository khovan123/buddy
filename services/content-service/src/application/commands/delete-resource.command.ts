export class DeleteResourceCommand {
  constructor(
    public readonly resourceId: string,
    public readonly requesterId: string,
  ) {}
}
