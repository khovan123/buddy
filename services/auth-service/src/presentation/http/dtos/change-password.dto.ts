import { IsString, MaxLength, MinLength } from 'class-validator';

/** Data Transfer Object for changing the current user's password. */
export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
