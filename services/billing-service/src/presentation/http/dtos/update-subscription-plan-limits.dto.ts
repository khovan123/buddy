import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateSubscriptionPlanLimitsDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyPriceCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  yearlyMonthlyPriceCents?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  storageBytes?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  maxResources?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  maxTutorials?: number;

  @IsOptional()
  @IsInt()
  @Min(-1)
  maxCollections?: number;

  @IsOptional()
  @IsBoolean()
  canCreateContent?: boolean;

  @IsOptional()
  @IsInt()
  @Min(-1)
  maxSearchResults?: number;
}
