export class CreateSkillCommand {
  constructor(
    public readonly name: string,
    public readonly careerId: string,
  ) {}
}
