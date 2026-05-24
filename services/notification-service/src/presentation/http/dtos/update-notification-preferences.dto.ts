import { IsBoolean, IsOptional } from 'class-validator';

/** Data Transfer Object for updating notification preferences. */
export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  productUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  learningReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  walletEvents?: boolean;

  @IsOptional()
  @IsBoolean()
  creatorSales?: boolean;

  @IsOptional()
  @IsBoolean()
  weeklyDigest?: boolean;
}
