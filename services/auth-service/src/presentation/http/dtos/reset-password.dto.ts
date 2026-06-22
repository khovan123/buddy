import { IsString, MaxLength, MinLength } from 'class-validator';

/** Data Transfer Object for resetting a user's password via a reset token. */
export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
