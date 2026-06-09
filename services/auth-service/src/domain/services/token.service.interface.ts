import type { SubscriptionPlanDetails } from '@libs/contracts';
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
  subscriptionPlanDetails?: SubscriptionPlanDetails;
  type: 'access';
}

export type GenerateTokenPairOptions = {
  subscriptionPlanDetails?: SubscriptionPlanDetails | null;
};

/** Domain service interface for token generation and verification. */
export interface ITokenService {
  generateTokenPair(
    user: User,
    options?: GenerateTokenPairOptions,
  ): Promise<TokenPair & { refreshTokenHash: string }>;
  verifyAccessToken(token: string): Promise<AccessTokenPayload>;
  getRefreshExpiresAt(): Date;
}
