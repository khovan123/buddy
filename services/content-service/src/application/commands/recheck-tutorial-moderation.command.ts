export class RecheckTutorialModerationCommand {
  constructor(
    public readonly tutorialId: string,
    public readonly requesterId: string,
    public readonly correlationId?: string,
  ) {}
}
