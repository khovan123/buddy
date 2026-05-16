export type OAuthProvider = 'google' | 'github';

/** CQRS Command designed to enforce OAuth login. */
export class OAuthLoginCommand {
  constructor(
    public readonly provider: OAuthProvider,
    public readonly providerToken: string,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
    public readonly correlationId?: string,
  ) {}
}
