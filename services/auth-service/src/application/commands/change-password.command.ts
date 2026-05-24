/** CQRS Command designed to change the current user's password. */
export class ChangePasswordCommand {
  constructor(
    public readonly userId: string,
    public readonly currentPassword: string,
    public readonly newPassword: string,
    public readonly correlationId?: string,
  ) {}
}
