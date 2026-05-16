import { JwtAuthGuard, getCorrelationId } from '@libs/common';
import { successResponse } from '@libs/contracts';
import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import crypto from 'crypto';
import type { FastifyRequest } from 'fastify';
import { CreateSubscriptionCommand } from '../../../application/commands/create-subscription.command';
import { ProcessPurchaseCommand } from '../../../application/commands/process-purchase.command';
import { SavePayoutAccountCommand } from '../../../application/commands/save-payout-account.command';
import { TopUpWalletCommand } from '../../../application/commands/top-up-wallet.command';
import { VerifyBankAccountCommand } from '../../../application/commands/verify-bank-account.command';
import { WithdrawWalletCommand } from '../../../application/commands/withdraw-wallet.command';
import { GetPayoutAccountQuery } from '../../../application/queries/get-payout-account.query';
import { GetSalesCountQuery } from '../../../application/queries/get-sales-count.query';
import { GetSubscriptionQuery } from '../../../application/queries/get-subscription.query';
import { GetTransactionHistoryQuery } from '../../../application/queries/get-transaction-history.query';
import { GetWalletBalanceQuery } from '../../../application/queries/get-wallet-balance.query';
import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';
import { SavePayoutAccountDto } from '../dtos/save-payout-account.dto';
import { ProcessPurchaseDto, TopUpWalletDto } from '../dtos/top-up-wallet.dto';
import { VerifyBankAccountDto } from '../dtos/verify-bank-account.dto';
import { WithdrawWalletDto } from '../dtos/withdraw-wallet.dto';

/** Controller handling incoming requests for Billing. */
@Controller({ path: 'billing', version: '1' })
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Executes the top up operation.
   *
   * @param req - The req parameter
   * @param dto - The dto parameter
   */
  @Post('wallet/top-up')
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async topUp(@Req() req: FastifyRequest & { user: { sub: string } }, @Body() dto: TopUpWalletDto) {
    const correlationId = getCorrelationId() || crypto.randomUUID();

    const result = await this.commandBus.execute(
      new TopUpWalletCommand(
        req.user.sub,
        BigInt(dto.amountInCents),
        dto.provider,
        dto.returnUrl,
        dto.cancelUrl,
        correlationId,
      ),
    );

    return successResponse(result, 'Top-up payment link created', correlationId);
  }

  /**
   * Executes the purchase operation.
   *
   * @param req - The req parameter
   * @param dto - The dto parameter
   */
  @Post('purchase')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async purchase(
    @Req() req: FastifyRequest & { user: { sub: string } },
    @Body() dto: ProcessPurchaseDto,
  ) {
    const correlationId = getCorrelationId() || crypto.randomUUID();

    const result = await this.commandBus.execute(
      new ProcessPurchaseCommand(req.user.sub, dto.itemType, dto.itemId, correlationId),
    );

    return successResponse(result, 'Purchase completed', correlationId);
  }

  // ── Payout Account ──────────────────────────────────────────────────

  @Post('payout-account/verify')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async verifyBankAccount(
    @Req() req: FastifyRequest & { user: { sub: string } },
    @Body() dto: VerifyBankAccountDto,
  ) {
    const correlationId = getCorrelationId() || crypto.randomUUID();
    const result = await this.commandBus.execute(
      new VerifyBankAccountCommand(req.user.sub, dto.bankBin, dto.bankAccountNumber),
    );

    return successResponse(result, 'Bank account verification result', correlationId);
  }

  @Put('payout-account')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async savePayoutAccount(
    @Req() req: FastifyRequest & { user: { sub: string } },
    @Body() dto: SavePayoutAccountDto,
  ) {
    const correlationId = getCorrelationId() || crypto.randomUUID();

    const result = await this.commandBus.execute(
      new SavePayoutAccountCommand(
        req.user.sub,
        dto.bankBin,
        dto.bankAccountNumber,
        dto.bankAccountName,
        dto.bankName,
      ),
    );

    return successResponse(result, 'Payout account saved', correlationId);
  }

  @Get('payout-account')
  @Version('1')
  async getPayoutAccount(@Req() req: FastifyRequest & { user: { sub: string } }) {
    const correlationId = getCorrelationId() || crypto.randomUUID();
    const result = await this.queryBus.execute(new GetPayoutAccountQuery(req.user.sub));
    return successResponse(result, 'Payout account retrieved', correlationId);
  }

  // ── Withdraw ────────────────────────────────────────────────────────

  @Post('wallet/withdraw')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async withdraw(
    @Req() req: FastifyRequest & { user: { sub: string } },
    @Body() dto: WithdrawWalletDto,
  ) {
    const correlationId = getCorrelationId() || crypto.randomUUID();
    const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

    const result = await this.commandBus.execute(
      new WithdrawWalletCommand(
        req.user.sub,
        BigInt(dto.amountInCents),
        idempotencyKey,
        correlationId,
      ),
    );

    return successResponse(result, 'Withdraw request created', correlationId);
  }

  // ── Subscription ────────────────────────────────────────────────────

  @Post('subscription')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async createSubscription(
    @Req() req: FastifyRequest & { user: { sub: string } },
    @Body() dto: CreateSubscriptionDto,
  ) {
    const correlationId = getCorrelationId() || crypto.randomUUID();
    const result = await this.commandBus.execute(
      new CreateSubscriptionCommand(req.user.sub, dto.plan, correlationId),
    );
    return successResponse(result, 'Subscription created', correlationId);
  }

  @Get('subscription')
  @Version('1')
  async getSubscription(@Req() req: FastifyRequest & { user: { sub: string } }) {
    const correlationId = getCorrelationId() || crypto.randomUUID();
    const result = await this.queryBus.execute(new GetSubscriptionQuery(req.user.sub));
    return successResponse(result, 'Subscription retrieved', correlationId);
  }

  // ── CQRS Queries (Read-side) ───────────────────────────────────────

  @Get('wallet/balance')
  @Version('1')
  async getWalletBalance(@Req() req: FastifyRequest & { user: { sub: string } }) {
    const correlationId = getCorrelationId() || crypto.randomUUID();
    const result = await this.queryBus.execute(new GetWalletBalanceQuery(req.user.sub));
    return successResponse(result, 'Wallet balance retrieved', correlationId);
  }

  @Get('wallet/transactions')
  @Version('1')
  async getTransactionHistory(
    @Req() req: FastifyRequest & { user: { sub: string } },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const correlationId = getCorrelationId() || crypto.randomUUID();
    const result = await this.queryBus.execute(
      new GetTransactionHistoryQuery(req.user.sub, page, limit),
    );
    return successResponse(result, 'Transaction history retrieved', correlationId);
  }

  // ── Creator Stats ────────────────────────────────────────────────────

  @Get('sales-count/:userId')
  @Version('1')
  async getSalesCount(@Param('userId') userId: string) {
    const correlationId = getCorrelationId() || crypto.randomUUID();
    const result = await this.queryBus.execute(new GetSalesCountQuery(userId));
    return successResponse(result, 'Sales count retrieved', correlationId);
  }
}
