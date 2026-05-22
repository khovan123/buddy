import { Public, getCorrelationId } from '@libs/common';
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
import { ConfirmSePayDepositWebhookCommand } from '../../../application/commands/confirm-sepay-deposit-webhook.command';
import { ConfirmSePayWithdrawWebhookCommand } from '../../../application/commands/confirm-sepay-withdraw-webhook.command';

type RawBodyFastifyRequest = FastifyRequest & {
  rawBody?: Buffer | string;
};

type SePayWebhookResponse = {
  success: true;
};

/** Controller handling incoming webhook/IPN requests for Billing. */
@Controller({ path: 'webhooks/billing', version: '1' })
export class WebhookController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('sepay/deposit')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async handleSePayDeposit(
    @Body() body: unknown,
    @Headers('x-secret-key') secretKey: string | undefined,
    @Req() req: RawBodyFastifyRequest,
  ): Promise<SePayWebhookResponse> {
    const correlationId = getCorrelationId() || crypto.randomUUID();
    const rawBody = this.getRawBody(req, body);

    await this.commandBus.execute(
      new ConfirmSePayDepositWebhookCommand(rawBody, secretKey, req.headers, correlationId),
    );

    return { success: true };
  }

  @Post('sepay/withdraw')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async handleSePayWithdraw(
    @Body() body: unknown,
    @Headers('x-secret-key') secretKey: string | undefined,
    @Req() req: RawBodyFastifyRequest,
  ): Promise<SePayWebhookResponse> {
    const correlationId = getCorrelationId() || crypto.randomUUID();
    const rawBody = this.getRawBody(req, body);

    await this.commandBus.execute(
      new ConfirmSePayWithdrawWebhookCommand(rawBody, secretKey, req.headers, correlationId),
    );
    return { success: true };
  }

  private getRawBody(req: RawBodyFastifyRequest, body: unknown): string {
    if (typeof req.rawBody === 'string') {
      return req.rawBody;
    }

    return req.rawBody?.toString('utf8') ?? JSON.stringify(body ?? {});
  }
}
