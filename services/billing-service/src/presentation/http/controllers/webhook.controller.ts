import { Public, getCorrelationId } from '@libs/common';
import { successResponse } from '@libs/contracts';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Version,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import crypto from 'crypto';
import type { FastifyRequest } from 'fastify';
import { ConfirmTopUpCommand } from '../../../application/commands/confirm-top-up.command';

/** Controller handling incoming requests for Webhook. */
@Controller({ path: 'webhooks/billing', version: '1' })
export class WebhookController {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Executes the handle pay o s webhook operation.
   *
   * @param body - The body parameter
   * @param signature - The signature parameter
   * @param req - The req parameter
   */
  @Post('payos')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async handlePayOSWebhook(
    @Body() body: unknown,
    @Headers('x-signature') signature: string | undefined,
    @Req() req: FastifyRequest,
  ) {
    const correlationId = getCorrelationId() || crypto.randomUUID();

    const result = await this.commandBus.execute(
      new ConfirmTopUpCommand(
        'PAYOS',
        JSON.stringify(body ?? {}),
        signature,
        req.headers,
        correlationId,
      ),
    );

    return successResponse(result, 'PAYOS webhook processed', correlationId);
  }

  /**
   * Executes the handle pay pal webhook operation.
   *
   * @param body - The body parameter
   * @param signature - The signature parameter
   * @param req - The req parameter
   */
  @Post('paypal')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async handlePayPalWebhook(
    @Body() body: unknown,
    @Headers('paypal-transmission-sig') signature: string | undefined,
    @Req() req: FastifyRequest,
  ) {
    const correlationId = getCorrelationId() || crypto.randomUUID();

    const result = await this.commandBus.execute(
      new ConfirmTopUpCommand(
        'PAYPAL',
        JSON.stringify(body ?? {}),
        signature,
        req.headers,
        correlationId,
      ),
    );

    return successResponse(result, 'PAYPAL webhook processed', correlationId);
  }
}
