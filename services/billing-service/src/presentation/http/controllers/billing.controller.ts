import { JwtAuthGuard, Public, getCorrelationId } from '@libs/common';
import { SubscriptionPlan, successResponse } from '@libs/contracts';
import {
  Body,
  Controller,
  DefaultValuePipe,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
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
import type { IPayoutGateway } from '../../../domain/repositories/payout-gateway.interface';
import { PAYOUT_GATEWAY, WALLET_REPOSITORY } from '../../../domain/repositories/tokens';
import type { IWalletRepository } from '../../../domain/repositories/wallet.repository.interface';
import { ContentCatalogRpcPublisher } from '../../../infrastructure/messaging/publishers/content-catalog.rpc';
import type { Prisma } from '../../../infrastructure/persistence/prisma/generated/client';
import type {
  SubscriptionAudience as PrismaSubscriptionAudience,
  SubscriptionPlan as PrismaSubscriptionPlan,
} from '../../../infrastructure/persistence/prisma/generated/enums';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';
import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';
import { SavePayoutAccountDto } from '../dtos/save-payout-account.dto';
import { ProcessPurchaseDto, TopUpWalletDto } from '../dtos/top-up-wallet.dto';
import { UpdateSubscriptionPlanLimitsDto } from '../dtos/update-subscription-plan-limits.dto';
import { VerifyBankAccountDto } from '../dtos/verify-bank-account.dto';
import { WithdrawWalletDto } from '../dtos/withdraw-wallet.dto';

type AudienceKey = 'creatorPlans' | 'studentPlans';
type PlanFeatureValue = string | boolean;

type CatalogSeedPlan = {
  code: SubscriptionPlan;
  audience: 'CREATOR' | 'STUDENT';
  audienceKey: AudienceKey;
  tier: 'free' | 'pro';
  title: string;
  groupDescription: string;
  iconKey: string;
  label: string;
  cta: string;
  description: string;
  badge?: string;
  monthlyPriceCents: number;
  yearlyMonthlyPriceCents?: number;
  storageBytes: bigint;
  maxResources: number;
  maxTutorials: number;
  maxCollections: number;
  canCreateContent: boolean;
  maxSearchResults: number;
  featureValues: Array<{ label: string; value: PlanFeatureValue }>;
  pbac: Record<string, unknown>;
  displayOrder: number;
};

type CatalogRow = {
  id: string;
  code: string;
  audience: 'CREATOR' | 'STUDENT';
  tier: string;
  title: string;
  groupDescription: string;
  iconKey: string;
  label: string;
  cta: string;
  description: string;
  badge: string | null;
  currency: string;
  monthlyPriceCents: number;
  yearlyMonthlyPriceCents: number | null;
  storageBytes: bigint;
  maxResources: number;
  maxTutorials: number;
  maxCollections: number;
  canCreateContent: boolean;
  maxSearchResults: number;
  featureValues: Prisma.JsonValue | null;
  pbac: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  displayOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const MB = 1024n * 1024n;
const GB = 1024n * MB;

const SUBSCRIPTION_PLAN_SEEDS: CatalogSeedPlan[] = [
  {
    code: SubscriptionPlan.CREATOR_FREE,
    audience: 'CREATOR',
    audienceKey: 'creatorPlans',
    tier: 'free',
    title: 'Creator',
    groupDescription: 'Build your audience and monetize your expertise.',
    iconKey: 'Palette',
    label: 'Free',
    cta: 'Start Creating',
    description: 'Get started with essential creator tools.',
    monthlyPriceCents: 0,
    storageBytes: 500n * MB,
    maxResources: 5,
    maxTutorials: 3,
    maxCollections: 2,
    canCreateContent: true,
    maxSearchResults: 20,
    featureValues: [
      { label: 'Storage', value: '500 MB' },
      { label: 'Resources', value: 'Up to 5' },
      { label: 'Tutorials', value: 'Up to 3' },
      { label: 'Collections', value: 'Up to 2' },
      { label: 'Analytics dashboard', value: true },
      { label: 'Advanced analytics', value: false },
      { label: 'Custom branding', value: false },
      { label: 'Priority review', value: false },
      { label: 'Discord support', value: false },
      { label: 'Revenue share', value: '85%' },
    ],
    pbac: {
      'content:create': true,
      'content:autoReview': false,
      'content:customBranding': false,
      'support:priority': false,
    },
    displayOrder: 10,
  },
  {
    code: SubscriptionPlan.CREATOR_PRO,
    audience: 'CREATOR',
    audienceKey: 'creatorPlans',
    tier: 'pro',
    title: 'Creator',
    groupDescription: 'Build your audience and monetize your expertise.',
    iconKey: 'Palette',
    label: 'Creator Pro',
    cta: 'Upgrade to Pro',
    description: 'Scale your content empire with unlimited power.',
    badge: 'Most Popular',
    monthlyPriceCents: 999,
    yearlyMonthlyPriceCents: 799,
    storageBytes: 50n * GB,
    maxResources: -1,
    maxTutorials: -1,
    maxCollections: -1,
    canCreateContent: true,
    maxSearchResults: -1,
    featureValues: [
      { label: 'Storage', value: '50 GB' },
      { label: 'Resources', value: 'Unlimited' },
      { label: 'Tutorials', value: 'Unlimited' },
      { label: 'Collections', value: 'Unlimited' },
      { label: 'Analytics dashboard', value: true },
      { label: 'Advanced analytics', value: true },
      { label: 'Custom branding', value: true },
      { label: 'Priority review', value: true },
      { label: 'Discord support', value: true },
      { label: 'Revenue share', value: '92%' },
    ],
    pbac: {
      'content:create': true,
      'content:autoReview': true,
      'content:customBranding': true,
      'support:priority': true,
    },
    displayOrder: 20,
  },
  {
    code: SubscriptionPlan.STUDENT_FREE,
    audience: 'STUDENT',
    audienceKey: 'studentPlans',
    tier: 'free',
    title: 'Student',
    groupDescription: 'Learn smarter with tools designed for students.',
    iconKey: 'Users',
    label: 'Free',
    cta: 'Start Learning',
    description: 'Access free resources and start your journey.',
    monthlyPriceCents: 0,
    storageBytes: 1n * GB,
    maxResources: 0,
    maxTutorials: 0,
    maxCollections: 0,
    canCreateContent: false,
    maxSearchResults: 10,
    featureValues: [
      { label: 'Storage', value: '1 GB' },
      { label: 'Data protection', value: false },
      { label: 'Collection discount', value: '—' },
      { label: 'Content preview', value: 'Standard' },
      { label: 'Auto-review content', value: false },
      { label: 'Bookmark & organize', value: true },
      { label: 'Offline access', value: false },
      { label: 'Discord support', value: false },
      { label: 'Early access', value: false },
      { label: 'Ad-free experience', value: false },
    ],
    pbac: {
      'content:create': false,
      'learning:dataProtection': false,
      'learning:offlineAccess': false,
      'learning:adFree': false,
    },
    displayOrder: 30,
  },
  {
    code: SubscriptionPlan.STUDENT_PRO,
    audience: 'STUDENT',
    audienceKey: 'studentPlans',
    tier: 'pro',
    title: 'Student',
    groupDescription: 'Learn smarter with tools designed for students.',
    iconKey: 'Users',
    label: 'Student Pro',
    cta: 'Upgrade to Pro',
    description: 'Unlock the full learning experience.',
    badge: 'Best Value',
    monthlyPriceCents: 499,
    yearlyMonthlyPriceCents: 399,
    storageBytes: 25n * GB,
    maxResources: 0,
    maxTutorials: 0,
    maxCollections: 0,
    canCreateContent: false,
    maxSearchResults: -1,
    featureValues: [
      { label: 'Storage', value: '25 GB' },
      { label: 'Data protection', value: true },
      { label: 'Collection discount', value: '15% off' },
      { label: 'Content preview', value: 'Extended' },
      { label: 'Auto-review content', value: true },
      { label: 'Bookmark & organize', value: true },
      { label: 'Offline access', value: true },
      { label: 'Discord support', value: true },
      { label: 'Early access', value: true },
      { label: 'Ad-free experience', value: true },
    ],
    pbac: {
      'content:create': false,
      'learning:dataProtection': true,
      'learning:offlineAccess': true,
      'learning:adFree': true,
    },
    displayOrder: 40,
  },
];

const COMPARISON_CATEGORIES = [
  {
    category: 'Storage & Limits',
    rows: [
      {
        label: 'Cloud storage',
        creatorFree: '500 MB',
        creatorPro: '50 GB',
        studentFree: '1 GB',
        studentPro: '25 GB',
      },
      {
        label: 'Resource uploads',
        creatorFree: '5',
        creatorPro: 'Unlimited',
        studentFree: '—',
        studentPro: '—',
      },
      {
        label: 'Tutorial creation',
        creatorFree: '3',
        creatorPro: 'Unlimited',
        studentFree: '—',
        studentPro: '—',
      },
      {
        label: 'Collection creation',
        creatorFree: '2',
        creatorPro: 'Unlimited',
        studentFree: '—',
        studentPro: '—',
      },
    ],
  },
  {
    category: 'Content & Learning',
    rows: [
      {
        label: 'Content preview',
        creatorFree: 'Standard',
        creatorPro: 'Extended',
        studentFree: 'Standard',
        studentPro: 'Extended',
      },
      {
        label: 'Auto-review',
        creatorFree: false,
        creatorPro: true,
        studentFree: false,
        studentPro: true,
      },
      {
        label: 'Data protection',
        creatorFree: false,
        creatorPro: false,
        studentFree: false,
        studentPro: true,
      },
      {
        label: 'Collection discount',
        creatorFree: '—',
        creatorPro: '—',
        studentFree: '—',
        studentPro: '15% off',
      },
      {
        label: 'Offline access',
        creatorFree: false,
        creatorPro: true,
        studentFree: false,
        studentPro: true,
      },
    ],
  },
  {
    category: 'Support & Extras',
    rows: [
      {
        label: 'Discord support',
        creatorFree: false,
        creatorPro: true,
        studentFree: false,
        studentPro: true,
      },
      {
        label: 'Priority support',
        creatorFree: false,
        creatorPro: true,
        studentFree: false,
        studentPro: true,
      },
      {
        label: 'Early access features',
        creatorFree: false,
        creatorPro: true,
        studentFree: false,
        studentPro: true,
      },
      {
        label: 'Ad-free experience',
        creatorFree: true,
        creatorPro: true,
        studentFree: false,
        studentPro: true,
      },
      {
        label: 'Custom branding',
        creatorFree: false,
        creatorPro: true,
        studentFree: '—',
        studentPro: '—',
      },
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: 'Can I switch between Creator and Student plans?',
    a: 'Yes! You can have both a Creator and Student subscription simultaneously, or switch between them at any time from your account settings.',
  },
  {
    q: 'What happens to my data if I downgrade?',
    a: "Your content remains accessible but you won't be able to create new content beyond the free tier limits. Existing content is never deleted.",
  },
  {
    q: "What does 'Data protection' mean for students?",
    a: "With Student Pro, if a creator deletes their resource, tutorial, or collection that you've purchased, your copy is preserved and remains accessible in your library.",
  },
  {
    q: 'Is there a refund policy?',
    a: 'Yes, we offer a 14-day money-back guarantee on all Pro plans. No questions asked.',
  },
  {
    q: 'Do you offer discounts for groups or institutions?',
    a: 'Absolutely! Contact us for custom pricing for universities, study groups, and educational institutions.',
  },
];

/** Controller handling incoming requests for Billing. */
@Controller({ path: 'billing', version: '1' })
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
    private readonly contentCatalogRpcPublisher: ContentCatalogRpcPublisher,
    @Inject(WALLET_REPOSITORY) private readonly walletRepository: IWalletRepository,
    @Inject(PAYOUT_GATEWAY) private readonly payoutGateway: IPayoutGateway,
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
    const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;

    const result = await this.commandBus.execute(
      new ProcessPurchaseCommand(
        req.user.sub,
        dto.itemType,
        dto.itemId,
        correlationId,
        idempotencyKey,
      ),
    );

    return successResponse(result, 'Purchase completed', correlationId);
  }

  @Post('purchase/quote')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async getPurchaseQuote(
    @Req() req: FastifyRequest & { user: { sub: string } },
    @Body() dto: ProcessPurchaseDto,
  ) {
    const [ownedResourceIds, ownedTutorialIds] = await Promise.all([
      this.walletRepository.findSuccessfulPurchasedItemIds(req.user.sub, 'RESOURCE'),
      this.walletRepository.findSuccessfulPurchasedItemIds(req.user.sub, 'TUTORIAL'),
    ]);
    const quote = await this.contentCatalogRpcPublisher.getPurchaseCatalog({
      itemId: dto.itemId,
      itemType: dto.itemType,
      userId: req.user.sub,
      ownedResourceIds: Array.from(ownedResourceIds),
      ownedTutorialIds: Array.from(ownedTutorialIds),
    });

    return successResponse(
      {
        itemId: dto.itemId,
        itemType: dto.itemType,
        payableAmountInCents: quote.priceInCents.toString(),
      },
      'Purchase quote retrieved',
      getCorrelationId() || crypto.randomUUID(),
    );
  }

  // ── Payout Account ──────────────────────────────────────────────────

  @Get('banks')
  @Public()
  @Version('1')
  async getBanks() {
    const correlationId = getCorrelationId() || crypto.randomUUID();
    const result = await this.payoutGateway.listBankProviders();
    return successResponse(result, 'Bank providers retrieved', correlationId);
  }

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

  @Get('subscription/plans')
  @Public()
  @Version('1')
  async getSubscriptionPlans() {
    const correlationId = getCorrelationId() || crypto.randomUUID();
    const plans = await this.getOrCreateSubscriptionPlanCatalog();
    return successResponse(
      this.toPricingData(plans),
      'Subscription plans retrieved',
      correlationId,
    );
  }

  @Put('subscription/plans/:code/limits')
  @UseGuards(JwtAuthGuard)
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async updateSubscriptionPlanLimits(
    @Req() req: FastifyRequest & { user: { roles?: string[] } },
    @Param('code') code: SubscriptionPlan,
    @Body() dto: UpdateSubscriptionPlanLimitsDto,
  ) {
    this.assertAdmin(req.user?.roles ?? []);

    const correlationId = getCorrelationId() || crypto.randomUUID();
    await this.getOrCreateSubscriptionPlanCatalog();

    const result = await this.prisma.client.subscriptionPlanCatalog.update({
      where: { code: code as PrismaSubscriptionPlan },
      data: {
        ...(dto.storageBytes === undefined ? {} : { storageBytes: BigInt(dto.storageBytes) }),
        ...(dto.maxResources === undefined ? {} : { maxResources: dto.maxResources }),
        ...(dto.maxTutorials === undefined ? {} : { maxTutorials: dto.maxTutorials }),
        ...(dto.maxCollections === undefined ? {} : { maxCollections: dto.maxCollections }),
        ...(dto.canCreateContent === undefined ? {} : { canCreateContent: dto.canCreateContent }),
        ...(dto.maxSearchResults === undefined ? {} : { maxSearchResults: dto.maxSearchResults }),
        ...(dto.monthlyPriceCents === undefined
          ? {}
          : { monthlyPriceCents: dto.monthlyPriceCents }),
        ...(dto.yearlyMonthlyPriceCents === undefined
          ? {}
          : {
              yearlyMonthlyPriceCents:
                dto.yearlyMonthlyPriceCents === null ? null : dto.yearlyMonthlyPriceCents,
            }),
      },
    });

    return successResponse(
      {
        code: result.code,
        pricing: {
          monthlyPriceCents: result.monthlyPriceCents,
          yearlyMonthlyPriceCents: result.yearlyMonthlyPriceCents,
          currency: result.currency,
        },
        limits: {
          storageBytes: Number(result.storageBytes),
          maxResources: result.maxResources,
          maxTutorials: result.maxTutorials,
          maxCollections: result.maxCollections,
          canCreateContent: result.canCreateContent,
          maxSearchResults: result.maxSearchResults,
        },
      },
      'Subscription plan limits updated',
      correlationId,
    );
  }

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

  private async getOrCreateSubscriptionPlanCatalog(): Promise<CatalogRow[]> {
    const existing = await this.prisma.client.subscriptionPlanCatalog.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });

    if (existing.length >= SUBSCRIPTION_PLAN_SEEDS.length) {
      return existing;
    }

    await Promise.all(
      SUBSCRIPTION_PLAN_SEEDS.map((seed) =>
        this.prisma.client.subscriptionPlanCatalog.upsert({
          where: { code: seed.code },
          update: {
            audience: seed.audience as PrismaSubscriptionAudience,
            tier: seed.tier,
            title: seed.title,
            groupDescription: seed.groupDescription,
            iconKey: seed.iconKey,
            label: seed.label,
            cta: seed.cta,
            description: seed.description,
            badge: seed.badge ?? null,
            monthlyPriceCents: seed.monthlyPriceCents,
            yearlyMonthlyPriceCents: seed.yearlyMonthlyPriceCents ?? null,
            storageBytes: seed.storageBytes,
            maxResources: seed.maxResources,
            maxTutorials: seed.maxTutorials,
            maxCollections: seed.maxCollections,
            canCreateContent: seed.canCreateContent,
            maxSearchResults: seed.maxSearchResults,
            featureValues: seed.featureValues as Prisma.InputJsonValue,
            pbac: seed.pbac as Prisma.InputJsonValue,
            metadata: { audienceKey: seed.audienceKey } as Prisma.InputJsonValue,
            displayOrder: seed.displayOrder,
            active: true,
          },
          create: {
            code: seed.code as PrismaSubscriptionPlan,
            audience: seed.audience as PrismaSubscriptionAudience,
            tier: seed.tier,
            title: seed.title,
            groupDescription: seed.groupDescription,
            iconKey: seed.iconKey,
            label: seed.label,
            cta: seed.cta,
            description: seed.description,
            badge: seed.badge ?? null,
            monthlyPriceCents: seed.monthlyPriceCents,
            yearlyMonthlyPriceCents: seed.yearlyMonthlyPriceCents ?? null,
            storageBytes: seed.storageBytes,
            maxResources: seed.maxResources,
            maxTutorials: seed.maxTutorials,
            maxCollections: seed.maxCollections,
            canCreateContent: seed.canCreateContent,
            maxSearchResults: seed.maxSearchResults,
            featureValues: seed.featureValues as Prisma.InputJsonValue,
            pbac: seed.pbac as Prisma.InputJsonValue,
            metadata: { audienceKey: seed.audienceKey } as Prisma.InputJsonValue,
            displayOrder: seed.displayOrder,
            active: true,
          },
        }),
      ),
    );

    return this.prisma.client.subscriptionPlanCatalog.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  private toPricingData(rows: CatalogRow[]) {
    const creatorRows = rows.filter((row) => row.audience === 'CREATOR');
    const studentRows = rows.filter((row) => row.audience === 'STUDENT');

    return {
      creatorPlans: this.toPlanGroup(creatorRows),
      studentPlans: this.toPlanGroup(studentRows),
      comparisonCategories: COMPARISON_CATEGORIES,
      faqItems: FAQ_ITEMS,
      planCatalog: rows.map((row) => ({
        code: row.code,
        audience: row.audience,
        tier: row.tier,
        pricing: {
          monthlyPriceCents: row.monthlyPriceCents,
          yearlyMonthlyPriceCents: row.yearlyMonthlyPriceCents,
          currency: row.currency,
        },
        limits: {
          storageBytes: Number(row.storageBytes),
          maxResources: row.maxResources,
          maxTutorials: row.maxTutorials,
          maxCollections: row.maxCollections,
          canCreateContent: row.canCreateContent,
          maxSearchResults: row.maxSearchResults,
        },
        pbac: row.pbac ?? {},
      })),
    };
  }

  private toPlanGroup(rows: CatalogRow[]) {
    const free = rows.find((row) => row.tier === 'free') ?? this.seedAsRow(rows[0], 'free');
    const pro = rows.find((row) => row.tier === 'pro') ?? this.seedAsRow(rows[0], 'pro');

    return {
      title: free.title,
      description: free.groupDescription,
      iconKey: free.iconKey,
      free: this.toPlanTier(free),
      pro: {
        ...this.toPlanTier(pro),
        yearlyMonthlyPriceCents: pro.yearlyMonthlyPriceCents ?? pro.monthlyPriceCents,
        badge: pro.badge ?? '',
      },
      features: this.toFeaturePairs(free, pro),
    };
  }

  private toPlanTier(row: CatalogRow) {
    return {
      monthlyPriceCents: row.monthlyPriceCents,
      priceInCents: row.monthlyPriceCents,
      currency: row.currency,
      label: row.label,
      cta: row.cta,
      description: row.description,
      ...(row.yearlyMonthlyPriceCents === null
        ? {}
        : { yearlyMonthlyPriceCents: row.yearlyMonthlyPriceCents }),
      ...(row.badge ? { badge: row.badge } : {}),
    };
  }

  private toFeaturePairs(free: CatalogRow, pro: CatalogRow) {
    const freeMap = this.featureValueMap(free.featureValues);
    const proMap = this.featureValueMap(pro.featureValues);
    const labels = [...new Set([...freeMap.keys(), ...proMap.keys()])];

    return labels.map((label) => ({
      label,
      free: freeMap.get(label) ?? false,
      pro: proMap.get(label) ?? false,
    }));
  }

  private featureValueMap(value: Prisma.JsonValue | null): Map<string, PlanFeatureValue> {
    if (!Array.isArray(value)) {
      return new Map();
    }

    return new Map(
      value
        .filter((item): item is { label: string; value: PlanFeatureValue } => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
          const candidate = item as Record<string, unknown>;
          return (
            typeof candidate.label === 'string' &&
            (typeof candidate.value === 'string' || typeof candidate.value === 'boolean')
          );
        })
        .map((item) => [item.label, item.value]),
    );
  }

  private seedAsRow(row: CatalogRow | undefined, tier: 'free' | 'pro'): CatalogRow {
    const seed =
      SUBSCRIPTION_PLAN_SEEDS.find(
        (item) => item.audience === row?.audience && item.tier === tier,
      ) ?? SUBSCRIPTION_PLAN_SEEDS.find((item) => item.tier === tier)!;

    return {
      ...seed,
      id: seed.code,
      code: seed.code,
      badge: seed.badge ?? null,
      currency: 'VND',
      yearlyMonthlyPriceCents: seed.yearlyMonthlyPriceCents ?? null,
      featureValues: seed.featureValues as Prisma.JsonValue,
      pbac: seed.pbac as Prisma.JsonValue,
      metadata: { audienceKey: seed.audienceKey },
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private assertAdmin(roles: string[]) {
    const hasAdminRole = roles.some((role) => role.trim().toUpperCase() === 'ADMIN');
    if (!hasAdminRole) {
      throw new ForbiddenException('Admin role required');
    }
  }
}
