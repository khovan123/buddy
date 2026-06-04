export class RecheckResourceModerationCommand {
  constructor(
    public readonly resourceId: string,
    public readonly requesterId: string,
    public readonly correlationId?: string,
  ) {}
}
