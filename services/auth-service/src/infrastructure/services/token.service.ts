import { CryptoUtil } from '@libs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID as uuidv4 } from 'node:crypto';
import { User } from '../../domain/entities/user.entity';
import type {
  AccessTokenPayload,
  GenerateTokenPairOptions,
  ITokenService,
  TokenPair,
} from '../../domain/services/token.service.interface';

/** Infrastructure implementation of the token domain service. */
@Injectable()
export class TokenService implements ITokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Executes the generate token pair operation.
   *
   * @param user - The user parameter
   * @returns Result of type Promise<TokenPair & { refreshTokenHash: string }>
   */
  async generateTokenPair(
    user: User,
    options: GenerateTokenPairOptions = {},
  ): Promise<TokenPair & { refreshTokenHash: string }> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email.value,
      nickname: user.nickname,
      roles: user.roles,
      type: 'access',
    };
    const planDetails = options.subscriptionPlanDetails;

    if (planDetails) {
      payload.subscriptionPlan = planDetails.code;
      payload.subscriptionPlanDetails = planDetails;
    } else if (user.subscriptionPlan) {
      payload.subscriptionPlan = user.subscriptionPlan;
    }

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    const rawRefreshToken = uuidv4() + '-' + CryptoUtil.generateSecureToken(16);
    const refreshTokenHash = CryptoUtil.sha256(rawRefreshToken);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      refreshTokenHash,
      accessExpiresIn: 900, // 15 min in seconds
    };
  }

  /**
   * Executes the verify access token operation.
   *
   * @param token - The token parameter
   * @returns Result of type Promise<AccessTokenPayload>
   */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Executes the get refresh expires at operation.
   *
   * @returns Result of type Date
   */
  getRefreshExpiresAt(): Date {
    const days = parseInt(this.config.get('JWT_REFRESH_EXPIRES_IN', '7d').replace('d', ''));
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }
}
