import { JwtAuthGuard, Public } from '@libs/common';
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
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

/** Controller handling incoming requests for AuthProxy. */
@UseGuards(JwtAuthGuard)
@Controller({ path: 'auth', version: '1' })
export class AuthProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  /**
   * Executes the register operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   */
  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 60_000, limit: 5 } }) // 5 registrations/min per IP
  register(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'auth',
      path: '/v1/auth/register',
      method: 'POST',
      body,
    });
  }

  /**
   * Executes the login operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   * @param reply - The reply parameter
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } }) // 10 login attempts/min
  login(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.proxy.forward(
      req,
      {
        service: 'auth',
        path: '/v1/auth/login',
        method: 'POST',
        body,
      },
      reply,
    );
  }

  /**
   * Executes the OAuth login operation (generic).
   *
   * @param body - The body parameter
   * @param req - The req parameter
   * @param reply - The reply parameter
   */
  @Post('oauth')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  oauthLogin(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.proxy.forward(
      req,
      {
        service: 'auth',
        path: '/v1/auth/oauth',
        method: 'POST',
        body,
      },
      reply,
    );
  }

  /**
   * Executes the Google OAuth login operation (backward compat).
   *
   * @param body - The body parameter
   * @param req - The req parameter
   * @param reply - The reply parameter
   */
  @Post('google')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  googleLogin(
    @Body() body: Record<string, unknown>,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    // Rewrite legacy { googleToken } body into { provider, providerToken }
    const normalized = {
      provider: 'google',
      providerToken: body.googleToken ?? body.providerToken,
    };
    return this.proxy.forward(
      req,
      {
        service: 'auth',
        path: '/v1/auth/oauth',
        method: 'POST',
        body: normalized,
      },
      reply,
    );
  }

  /**
   * Executes the verify otp operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   * @param reply - The reply parameter
   */
  @Post('verify-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  verifyOtp(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.proxy.forward(
      req,
      {
        service: 'auth',
        path: '/v1/auth/verify-otp',
        method: 'POST',
        body,
      },
      reply,
    );
  }

  /**
   * Executes the resend otp operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   */
  @Post('resend-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 3 } }) // 3 resends/min
  resendOtp(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'auth',
      path: '/v1/auth/resend-otp',
      method: 'POST',
      body,
    });
  }

  /**
   * Executes the refresh operation.
   *
   * @param req - The req parameter
   * @param reply - The reply parameter
   */
  @Get('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    return this.proxy.forward(
      req,
      {
        service: 'auth',
        path: '/v1/auth/refresh',
        method: 'GET',
      },
      reply,
    );
  }

  /**
   * Executes the logout operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   * @param reply - The reply parameter
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.proxy.forward(
      req,
      {
        service: 'auth',
        path: '/v1/auth/logout',
        method: 'POST',
        body,
      },
      reply,
    );
  }

  /**
   * Executes the get me operation.
   *
   * @param req - The req parameter
   */
  @Get('me')
  getMe(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'auth',
      path: '/v1/auth/me',
      method: 'GET',
    });
  }

  /**
   * Executes the get user verification operation.
   *
   * @param id - The user id parameter
   * @param req - The req parameter
   */
  @Get('users/:id/verification')
  @Public()
  getUserVerification(@Param('id') id: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'auth',
      path: `/v1/auth/users/${id}/verification`,
      method: 'GET',
    });
  }

  /**
   * Executes the change password operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   */
  @Patch('password')
  @HttpCode(HttpStatus.OK)
  changePassword(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'auth',
      path: '/v1/auth/password',
      method: 'PATCH',
      body,
    });
  }
}
