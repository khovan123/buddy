import { JwtAuthGuard, Public, getCorrelationId } from '@libs/common';
import { successResponse } from '@libs/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  Version,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ChangePasswordCommand } from '../../../application/commands/change-password.command';
import { ForgotPasswordCommand } from '../../../application/commands/forgot-password.command';
import { LoginUserCommand } from '../../../application/commands/login-user.command';
import { LogoutUserCommand } from '../../../application/commands/logout-user.command';
import type { OAuthProvider } from '../../../application/commands/oauth-login.command';
import { OAuthLoginCommand } from '../../../application/commands/oauth-login.command';
import { RefreshTokenCommand } from '../../../application/commands/refresh-token.command';
import { RegisterUserCommand } from '../../../application/commands/register-user.command';
import { ResendOtpCommand } from '../../../application/commands/resend-otp.command';
import { ResetPasswordCommand } from '../../../application/commands/reset-password.command';
import { VerifyOtpCommand } from '../../../application/commands/verify-otp.command';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { GetMeQuery } from '../../../application/queries/get-me.query';
import { GetUserVerificationQuery } from '../../../application/queries/get-user-verification.query';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { LoginDto } from '../dtos/login.dto';
import { OAuthLoginDto } from '../dtos/oauth-login.dto';
import { RegisterDto } from '../dtos/register.dto';
import { ResendOtpDto } from '../dtos/resend-otp.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { VerifyOtpDto } from '../dtos/verify-otp.dto';

/** Controller handling incoming requests for Auth. */
@Controller({ path: 'auth', version: '1' })
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
  ) {}

  @Get('admin/overview/users')
  @Version('1')
  async getAdminUserOverview(@Req() req: FastifyRequest & { user: { roles?: string[] } }) {
    this.assertAdmin(req.user?.roles ?? []);

    const [total, creators, students] = await Promise.all([
      this.prisma.client.user.count(),
      this.prisma.client.user.count({
        where: {
          OR: [
            { roles: { has: 'creator' } },
            { roles: { has: 'CREATOR' } },
            { subscriptionPlan: { startsWith: 'CREATOR' } },
          ],
        },
      }),
      this.prisma.client.user.count({
        where: {
          OR: [
            { roles: { has: 'student' } },
            { roles: { has: 'STUDENT' } },
            { subscriptionPlan: { startsWith: 'STUDENT' } },
          ],
        },
      }),
    ]);

    return successResponse(
      { total, creators, students },
      'Admin user overview retrieved',
      getCorrelationId(),
    );
  }

  private assertAdmin(roles: string[]) {
    if (!roles.some((role) => role.trim().toUpperCase() === 'ADMIN')) {
      throw new ForbiddenException('Admin role required');
    }
  }

  /**
   * Executes the register operation.
   *
   * @param dto - The dto parameter
   */
  @Post('register')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    const result = await this.commandBus.execute(
      new RegisterUserCommand(dto.email, dto.password, dto.nickname, getCorrelationId()),
    );
    return successResponse(result, 'Registration successful', getCorrelationId());
  }

  /**
   * Executes the login operation.
   *
   * @param dto - The dto parameter
   * @param req - The req parameter
   * @param res - The res parameter
   */
  @Post('login')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.commandBus.execute(
      new LoginUserCommand(
        dto.email,
        dto.password,
        req.ip,
        req.headers['user-agent'],
        getCorrelationId(),
      ),
    );

    if (result.refreshToken) {
      res.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
      });
    }

    return successResponse(result, 'Login successful', getCorrelationId());
  }

  /**
   * Executes the OAuth login operation.
   *
   * @param dto - The dto parameter
   * @param req - The req parameter
   * @param res - The res parameter
   */
  @Post('oauth')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async oauthLogin(
    @Body() dto: OAuthLoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.commandBus.execute(
      new OAuthLoginCommand(
        dto.provider as OAuthProvider,
        dto.providerToken,
        req.ip,
        req.headers['user-agent'],
        getCorrelationId(),
      ),
    );

    if (result.refreshToken) {
      res.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
      });
    }

    return successResponse(result, 'OAuth login successful', getCorrelationId());
  }

  /**
   * Executes the verify otp operation.
   *
   * @param dto - The dto parameter
   * @param req - The req parameter
   * @param res - The res parameter
   */
  @Post('verify-otp')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.commandBus.execute(
      new VerifyOtpCommand(
        dto.email,
        dto.otp,
        req.ip,
        req.headers['user-agent'],
        getCorrelationId(),
      ),
    );

    if (result.refreshToken) {
      res.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
      });
    }

    return successResponse(result, 'OTP verified successfully', getCorrelationId());
  }

  /**
   * Executes the resend otp operation.
   *
   * @param dto - The dto parameter
   */
  @Post('resend-otp')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: ResendOtpDto) {
    const result = await this.commandBus.execute(
      new ResendOtpCommand(dto.email, dto.purpose ?? 'EMAIL_VERIFICATION', getCorrelationId()),
    );
    return successResponse(result, 'OTP resent', getCorrelationId());
  }

  /**
   * Executes the refresh operation.
   *
   * @param req - The req parameter
   * @param res - The res parameter
   */
  @Get('refresh')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const refreshToken = req.cookies['refreshToken'];

    const result = await this.commandBus.execute(new RefreshTokenCommand(refreshToken || ''));

    if (result.refreshToken) {
      res.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
      });
    }

    return successResponse(result, undefined, getCorrelationId());
  }

  /**
   * Executes the logout operation.
   *
   * @param req - The req parameter
   * @param res - The res parameter
   */
  @Post('logout')
  @Version('1')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: FastifyRequest & { user: { sub: string } },
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const refreshToken = req.cookies['refreshToken'];

    res.clearCookie('refreshToken', { path: '/' });

    await this.commandBus.execute(new LogoutUserCommand(req.user.sub, refreshToken));
  }

  /**
   * Executes the get me operation.
   *
   * @param req - The req parameter
   */
  @Get('me')
  @Version('1')
  async getMe(@Req() req: FastifyRequest & { user: { sub: string } }) {
    const result = await this.queryBus.execute(new GetMeQuery(req.user.sub));
    return successResponse(result, undefined, getCorrelationId());
  }

  /**
   * Executes the get user verification operation.
   *
   * @param id - The user id parameter
   */
  @Get('users/:id/verification')
  @Public()
  @Version('1')
  async getUserVerification(@Param('id') id: string) {
    const result = await this.queryBus.execute(new GetUserVerificationQuery(id));
    return successResponse(result, undefined, getCorrelationId());
  }

  /**
   * Executes the change password operation.
   *
   * @param req - The req parameter
   * @param dto - The dto parameter
   */
  @Patch('password')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: FastifyRequest & { user: { sub: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    await this.commandBus.execute(
      new ChangePasswordCommand(
        req.user.sub,
        dto.currentPassword,
        dto.newPassword,
        getCorrelationId(),
      ),
    );

    return successResponse(null, 'Password changed successfully', getCorrelationId());
  }

  /**
   * Executes the forgot password operation — sends a reset link to the given email.
   *
   * @param dto - The dto parameter
   * @param req - The req parameter
   */
  @Post('forgot-password')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Headers('x-app-url') appUrlHeader: string,
    @Req() req: FastifyRequest,
  ) {
    const appUrl = appUrlHeader || `${req.protocol}://${req.hostname}`;

    await this.commandBus.execute(new ForgotPasswordCommand(dto.email, appUrl, getCorrelationId()));

    // Always return a generic message to prevent user enumeration
    return successResponse(
      null,
      'If an account with that email exists, a reset link has been sent.',
      getCorrelationId(),
    );
  }

  /**
   * Executes the reset password operation — validates token and sets new password.
   *
   * @param dto - The dto parameter
   */
  @Post('reset-password')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.commandBus.execute(
      new ResetPasswordCommand(dto.token, dto.newPassword, getCorrelationId()),
    );

    return successResponse(null, 'Password reset successfully', getCorrelationId());
  }
}
