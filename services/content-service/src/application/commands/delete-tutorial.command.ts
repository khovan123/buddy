export class DeleteTutorialCommand {
  constructor(
    public readonly tutorialId: string,
    public readonly requesterId: string,
  ) {}
}
