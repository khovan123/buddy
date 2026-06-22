import { IsEmail, IsString } from 'class-validator';

/** Data Transfer Object for requesting a password reset email. */
export class ForgotPasswordDto {
  @IsEmail()
  @IsString()
  email!: string;
}
