export class CreateCareerCommand {
  constructor(
    public readonly name: string,
    public readonly description: string,
  ) {}
}
