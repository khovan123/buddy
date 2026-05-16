/** CQRS Command designed to enforce  send welcome email. */
export class SendWelcomeEmailCommand {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly nickname: string,
    public readonly correlationId?: string,
  ) {}
}
