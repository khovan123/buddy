import type { User } from '../entities/user.entity';

/** Interface representing data constraints for  token pair. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
}

/** Interface representing data constraints for  access token payload. */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  nickname: string;
  roles: string[];
  subscriptionPlan?: string;
  type: 'access';
}

/** Domain service interface for token generation and verification. */
export interface ITokenService {
  generateTokenPair(user: User): Promise<TokenPair & { refreshTokenHash: string }>;
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;
  getRefreshExpiresAt(): Date;
}
