import { IsEnum, IsNotEmpty, IsNumberString, IsUrl, MinLength } from 'class-validator';

const PAYMENT_PROVIDERS = {
  SEPAY: 'SEPAY',
} as const;

const PRODUCT_TYPES = {
  RESOURCE: 'RESOURCE',
  TUTORIAL: 'TUTORIAL',
  RESOURCE_COLLECTION: 'RESOURCE_COLLECTION',
  TUTORIAL_COLLECTION: 'TUTORIAL_COLLECTION',
  TUTORIAL_BUNDLE: 'TUTORIAL_BUNDLE',
  TUTORIAL_BUNDLE_COLLECTION: 'TUTORIAL_BUNDLE_COLLECTION',
} as const;

/** Data Transfer Object for  top up wallet. */
export class TopUpWalletDto {
  @IsNumberString()
  amountInCents!: string;

  @IsEnum(PAYMENT_PROVIDERS)
  provider!: 'SEPAY';

  @IsUrl()
  returnUrl!: string;

  @IsUrl()
  cancelUrl!: string;
}

/** Data Transfer Object for  process purchase. */
export class ProcessPurchaseDto {
  @IsEnum(PRODUCT_TYPES)
  itemType!:
    | 'RESOURCE'
    | 'TUTORIAL'
    | 'RESOURCE_COLLECTION'
    | 'TUTORIAL_COLLECTION'
    | 'TUTORIAL_BUNDLE'
    | 'TUTORIAL_BUNDLE_COLLECTION';

  @IsNotEmpty()
  @MinLength(10)
  itemId!: string;
}
