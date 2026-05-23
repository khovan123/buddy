import { JwtAuthGuard, Public } from '@libs/common';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

type RawBodyFastifyRequest = FastifyRequest & {
  rawBody?: Buffer | string;
};

/** Controller handling incoming requests for BillingProxy. */
@Controller({ path: 'billing', version: '1' })
export class BillingProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  // ── Wallet ─────────────────────────────────────────────────────────

  /**
   * Executes the top up wallet operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   */
  @Post('wallet/top-up')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  topUpWallet(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'billing',
      path: '/v1/billing/wallet/top-up',
      method: 'POST',
      body,
    });
  }

  /**
   * Executes the withdraw from wallet operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   */
  @Post('wallet/withdraw')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @HttpCode(HttpStatus.OK)
  withdraw(@Body() body: unknown, @Req() req: FastifyRequest) {
    const idempotencyKey = (req.headers as Record<string, string | undefined>)['x-idempotency-key'];
    return this.proxy.forward(req, {
      service: 'billing',
      path: '/v1/billing/wallet/withdraw',
      method: 'POST',
      body,
      headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
    });
  }

  /**
   * Executes the get wallet balance operation.
   *
   * @param req - The req parameter
   */
  @Get('wallet/balance')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  getWalletBalance(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'billing',
      path: '/v1/billing/wallet/balance',
      method: 'GET',
    });
  }

  /**
   * Executes the get transaction history operation.
   *
   * @param req - The req parameter
   * @param query - The query parameter
   */
  @Get('wallet/transactions')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  getTransactionHistory(@Req() req: FastifyRequest, @Query() query: Record<string, string>) {
    return this.proxy.forward(req, {
      service: 'billing',
      path: '/v1/billing/wallet/transactions',
      method: 'GET',
      query,
    });
  }

  // ── Purchase ───────────────────────────────────────────────────────

  /**
   * Executes the process purchase operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   */
  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @HttpCode(HttpStatus.OK)
  processPurchase(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'billing',
      path: '/v1/billing/purchase',
      method: 'POST',
      body,
    });
  }

  // ── Payout Account ─────────────────────────────────────────────────

  @Get('banks')
  @Public()
  @Version('1')
  getBanks(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'billing',
      path: '/v1/billing/banks',
      method: 'GET',
    });
  }

  /**
   * Executes the verify bank account operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   */
  @Post('payout-account/verify')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @HttpCode(HttpStatus.OK)
  verifyBankAccount(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'billing',
      path: '/v1/billing/payout-account/verify',
      method: 'POST',
      body,
    });
  }

  /**
   * Executes the save payout account operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   */
  @Put('payout-account')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @HttpCode(HttpStatus.OK)
  savePayoutAccount(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'billing',
      path: '/v1/billing/payout-account',
      method: 'PUT',
      body,
    });
  }

  /**
   * Executes the get payout account operation.
   *
   * @param req - The req parameter
   */
  @Get('payout-account')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  getPayoutAccount(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'billing',
      path: '/v1/billing/payout-account',
      method: 'GET',
    });
  }

  // ── Subscription ───────────────────────────────────────────────────

  @Get('subscription/plans')
  @Public()
  @Version('1')
  getSubscriptionPlans(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'billing',
      path: '/v1/billing/subscription/plans',
      method: 'GET',
    });
  }

  /**
   * Executes the create subscription operation.
   *
   * @param body - The body parameter
   * @param req - The req parameter
   */
  @Post('subscription')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @HttpCode(HttpStatus.OK)
  createSubscription(@Body() body: unknown, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'billing',
      path: '/v1/billing/subscription',
      method: 'POST',
      body,
    });
  }

  /**
   * Executes the get subscription operation.
   *
   * @param req - The req parameter
   */
  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  getSubscription(@Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'billing',
      path: '/v1/billing/subscription',
      method: 'GET',
    });
  }

  // ── Creator Stats ─────────────────────────────────────────────────

  @Get('sales-count/:userId')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  getSalesCount(@Param('userId') userId: string, @Req() req: FastifyRequest) {
    return this.proxy.forward(req, {
      service: 'billing',
      path: `/v1/billing/sales-count/${userId}`,
      method: 'GET',
    });
  }
}

/** Controller handling incoming requests for BillingWebhookProxy. */
@Controller({ path: 'webhooks/billing', version: '1' })
export class BillingWebhookProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Post('sepay/deposit')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  handleSePayDepositWebhook(
    @Body() body: unknown,
    @Headers('x-secret-key') secretKey: string | undefined,
    @Headers('x-sepay-signature') sepaySignature: string | undefined,
    @Headers('x-sepay-timestamp') sepayTimestamp: string | undefined,
    @Headers('content-type') contentType: string | undefined,
    @Req() req: RawBodyFastifyRequest,
  ) {
    return this.forwardSePayWebhook(req, body, {
      secretKey,
      sepaySignature,
      sepayTimestamp,
      contentType,
      path: '/v1/webhooks/billing/sepay/deposit',
    });
  }

  @Post('sepay/withdraw')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  handleSePayWithdrawWebhook(
    @Body() body: unknown,
    @Headers('x-secret-key') secretKey: string | undefined,
    @Headers('x-sepay-signature') sepaySignature: string | undefined,
    @Headers('x-sepay-timestamp') sepayTimestamp: string | undefined,
    @Headers('content-type') contentType: string | undefined,
    @Req() req: RawBodyFastifyRequest,
  ) {
    return this.forwardSePayWebhook(req, body, {
      secretKey,
      sepaySignature,
      sepayTimestamp,
      contentType,
      path: '/v1/webhooks/billing/sepay/withdraw',
    });
  }

  private forwardSePayWebhook(
    req: RawBodyFastifyRequest,
    body: unknown,
    input: {
      secretKey?: string;
      sepaySignature?: string;
      sepayTimestamp?: string;
      contentType?: string;
      path: string;
    },
  ) {
    const headers: Record<string, string> = {};
    if (input.secretKey) headers['x-secret-key'] = input.secretKey;
    if (input.sepaySignature) headers['x-sepay-signature'] = input.sepaySignature;
    if (input.sepayTimestamp) headers['x-sepay-timestamp'] = input.sepayTimestamp;
    if (input.contentType) headers['content-type'] = input.contentType;

    const rawBody =
      typeof req.rawBody === 'string'
        ? req.rawBody
        : (req.rawBody?.toString('utf8') ?? JSON.stringify(body ?? {}));

    return this.proxy.forward(req, {
      service: 'billing',
      path: input.path,
      method: 'POST',
      body,
      rawBody,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
  }
}
