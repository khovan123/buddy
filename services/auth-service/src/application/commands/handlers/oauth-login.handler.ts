import { CryptoUtil } from '@libs/common';
import { UserLoggedInEvent, UserRegisteredEvent } from '@libs/contracts';
import { Inject, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID as uuidv4 } from 'node:crypto';
import { User } from '../../../domain/entities/user.entity';
import type { IRefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository.interface';
import {
  REFRESH_TOKEN_REPOSITORY,
  TOKEN_SERVICE,
  USER_REPOSITORY,
} from '../../../domain/repositories/tokens';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface';
import type { ITokenService } from '../../../domain/services/token.service.interface';
import { AuthEventPublisher } from '../../../infrastructure/messaging/publishers/auth-event.publisher';
import { BillingSubscriptionPlanPublisher } from '../../../infrastructure/messaging/publishers/billing-subscription-plan.rpc';
import type { OAuthProvider } from '../oauth-login.command';
import { OAuthLoginCommand } from '../oauth-login.command';

import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client();

function getGoogleClientAudiences(): string | string[] | undefined {
  const configured = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_IDS,
    process.env.NEXT_GOOGLE_CLIENT_ID,
  ]
    .flatMap((value) => (value ? value.split(',') : []))
    .map((value) => value.trim())
    .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);

  if (configured.length === 0) {
    return undefined;
  }

  return configured.length === 1 ? configured[0] : configured;
}

/** Verified profile from an OAuth provider. */
interface OAuthProfile {
  email: string;
  name?: string;
}

/** CQRS Handler to execute OAuth login/registration. */
@CommandHandler(OAuthLoginCommand)
export class OAuthLoginHandler implements ICommandHandler<OAuthLoginCommand> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: ITokenService,
    private readonly publisher: AuthEventPublisher,
    private readonly billingSubscriptionPlanPublisher: BillingSubscriptionPlanPublisher,
  ) {}

  async execute(command: OAuthLoginCommand) {
    const { provider, providerToken, ipAddress, userAgent, correlationId } = command;

    // 1. Verify token with provider and extract email
    const profile = await this.verifyProviderToken(provider, providerToken);

    // 2. Find or create user
    let user = await this.userRepository.findByEmail(profile.email);
    let isNewUser = false;

    if (!user) {
      // Auto-create account with sentinel password hash
      const sentinelHash = await CryptoUtil.hashPassword(uuidv4());
      const nickname = profile.name || profile.email.split('@')[0];

      user = User.create({
        email: profile.email,
        hashedPassword: sentinelHash,
        nickname,
      });
      // Auto-verify email since OAuth provider already verified it
      user.verifyEmail();
      await this.userRepository.save(user);
      isNewUser = true;

      await this.publisher.publish(
        new UserRegisteredEvent(
          {
            userId: user.id,
            email: user.email.value,
            nickname: user.nickname,
            registeredAt: user.createdAt,
          },
          correlationId,
        ),
      );
    }

    // 3. Domain guard
    if (!user.canLogin()) {
      throw new UnauthorizedException(`Account status: ${user.status}`);
    }

    // 4. Record login
    user.recordLogin();
    await this.userRepository.update(user);

    // 5. Resolve plan details from billing-service via RabbitMQ RPC.
    // Keep this response shape in sync with LoginUserHandler so every auth path
    // hydrates the same NextAuth/session claims.
    const subscriptionPlanDetails =
      await this.billingSubscriptionPlanPublisher.resolveUserPlanDetails(
        user.id,
        user.subscriptionPlan,
      );
    const subscriptionPlan = subscriptionPlanDetails?.code ?? user.subscriptionPlan;

    // 6. Generate tokens
    const { accessToken, refreshToken, refreshTokenHash, accessExpiresIn } =
      await this.tokenService.generateTokenPair(user, { subscriptionPlanDetails });

    // 7. Persist refresh token
    await this.refreshTokenRepository.save({
      id: uuidv4(),
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: this.tokenService.getRefreshExpiresAt(),
      createdAt: new Date(),
      ipAddress,
      userAgent,
    });

    // 8. Publish login event
    await this.publisher.publish(
      new UserLoggedInEvent(
        {
          userId: user.id,
          email: user.email.value,
          ipAddress: ipAddress || '',
          userAgent: userAgent || '',
        },
        correlationId,
      ),
    );

    return {
      user: {
        id: user.id,
        email: user.email.value,
        nickname: user.nickname,
        role: user.roles[0] ?? 'user',
        roles: user.roles,
        subscriptionPlan,
        subscriptionPlanDetails,
      },
      accessToken,
      refreshToken,
      accessExpiresIn,
      isNewUser,
    };
  }

  /** Verify token with the given OAuth provider and return the user's profile. */
  private async verifyProviderToken(provider: OAuthProvider, token: string): Promise<OAuthProfile> {
    switch (provider) {
      case 'google':
        return this.verifyGoogleToken(token);
      case 'github':
        return this.verifyGitHubToken(token);
      default:
        throw new UnauthorizedException(`Unsupported OAuth provider: ${provider}`);
    }
  }

  /** Verify a Google ID token via google-auth-library (local RSA signature check). */
  private async verifyGoogleToken(idToken: string): Promise<OAuthProfile> {
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: getGoogleClientAudiences(),
      });
      const payload = ticket.getPayload();
      if (!payload?.email) throw new UnauthorizedException('Google token missing email');

      return { email: payload.email.toLowerCase(), name: payload.name };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  /** Verify a GitHub OAuth access token via GitHub's user API. */
  private async verifyGitHubToken(accessToken: string): Promise<OAuthProfile> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new UnauthorizedException('GitHub OAuth credentials are not configured');
    }

    // Kiểm tra token có hợp lệ và thuộc đúng OAuth App hay không
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenCheckRes = await fetch(`https://api.github.com/applications/${clientId}/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: accessToken,
      }),
    });

    if (!tokenCheckRes.ok) {
      throw new UnauthorizedException(
        'Invalid GitHub token or token does not belong to this application',
      );
    }

    const checkedToken = (await tokenCheckRes.json()) as {
      app?: {
        client_id?: string;
      };
      user?: {
        login?: string;
        name?: string;
        email?: string;
      };
    };

    if (checkedToken.app?.client_id !== clientId) {
      throw new UnauthorizedException('GitHub token audience mismatch');
    }

    // Lấy profile mới nhất
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!userRes.ok) {
      throw new UnauthorizedException('Invalid GitHub token');
    }

    const user = (await userRes.json()) as {
      email?: string;
      name?: string;
      login?: string;
    };

    let email = user.email;

    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
        },
      });

      if (emailsRes.ok) {
        const emails = (await emailsRes.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;

        email =
          emails.find((item) => item.primary && item.verified)?.email ??
          emails.find((item) => item.verified)?.email;
      }
    }

    if (!email) {
      throw new UnauthorizedException('GitHub token missing verified email');
    }

    return {
      email: email.toLowerCase(),
      name: user.name || user.login,
    };
  }
}
