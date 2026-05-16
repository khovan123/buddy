import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length } from 'class-validator';

/** Data Transfer Object for  verify otp. */
export class VerifyOtpDto {
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @Length(6, 6)
  otp!: string;
}
