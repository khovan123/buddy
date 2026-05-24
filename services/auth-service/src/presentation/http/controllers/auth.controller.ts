import { JwtAuthGuard, Public, getCorrelationId } from '@libs/common';
import { successResponse } from '@libs/contracts';
import {
  Body,
  Controller,
  Get,
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
import { LoginUserCommand } from '../../../application/commands/login-user.command';
import { LogoutUserCommand } from '../../../application/commands/logout-user.command';
import { OAuthLoginCommand } from '../../../application/commands/oauth-login.command';
import type { OAuthProvider } from '../../../application/commands/oauth-login.command';
import { RefreshTokenCommand } from '../../../application/commands/refresh-token.command';
import { RegisterUserCommand } from '../../../application/commands/register-user.command';
import { ResendOtpCommand } from '../../../application/commands/resend-otp.command';
import { VerifyOtpCommand } from '../../../application/commands/verify-otp.command';
import { GetMeQuery } from '../../../application/queries/get-me.query';
import { GetUserVerificationQuery } from '../../../application/queries/get-user-verification.query';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { LoginDto } from '../dtos/login.dto';
import { OAuthLoginDto } from '../dtos/oauth-login.dto';
import { RegisterDto } from '../dtos/register.dto';
import { ResendOtpDto } from '../dtos/resend-otp.dto';
import { VerifyOtpDto } from '../dtos/verify-otp.dto';

/** Controller handling incoming requests for Auth. */
@Controller({ path: 'auth', version: '1' })
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

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
}
