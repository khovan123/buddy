import { JwtAuthGuard, Public } from '@libs/common';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { HttpProxyService } from '../../../infrastructure/http/http-proxy.service';

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
    console.log(body);
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
}

/** Controller handling incoming requests for BillingWebhookProxy. */
@Controller({ path: 'webhooks/billing', version: '1' })
export class BillingWebhookProxyController {
  constructor(private readonly proxy: HttpProxyService) {}

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
  handlePayOSWebhook(
    @Body() body: unknown,
    @Headers('x-signature') signature: string | undefined,
    @Req() req: FastifyRequest,
  ) {
    const headers = signature ? { 'x-signature': signature } : undefined;
    return this.proxy.forward(req, {
      service: 'billing',
      path: '/v1/webhooks/billing/payos',
      method: 'POST',
      body,
      headers,
    });
  }

  /**
   * Executes the handle pay pal webhook operation.
   *
   * @param body - The body parameter
   * @param paypalSig - The paypalSig parameter
   * @param paypalTime - The paypalTime parameter
   * @param paypalId - The paypalId parameter
   * @param req - The req parameter
   */
  @Post('paypal')
  @Public()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  handlePayPalWebhook(
    @Body() body: unknown,
    @Headers('paypal-transmission-sig') paypalSig: string | undefined,
    @Headers('paypal-transmission-time') paypalTime: string | undefined,
    @Headers('paypal-transmission-id') paypalId: string | undefined,
    @Req() req: FastifyRequest,
  ) {
    const headers: Record<string, string> = {};
    if (paypalSig) headers['paypal-transmission-sig'] = paypalSig;
    if (paypalTime) headers['paypal-transmission-time'] = paypalTime;
    if (paypalId) headers['paypal-transmission-id'] = paypalId;

    return this.proxy.forward(req, {
      service: 'billing',
      path: '/v1/webhooks/billing/paypal',
      method: 'POST',
      body,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
  }
}
