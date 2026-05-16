import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import type { OtpPurpose } from '../../../domain/value-objects/otp.vo';

/** Data Transfer Object for  resend otp. */
export class ResendOtpDto {
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @IsOptional()
  @IsString()
  @IsIn(['EMAIL_VERIFICATION', 'TWO_FA'])
  purpose?: OtpPurpose;
}
