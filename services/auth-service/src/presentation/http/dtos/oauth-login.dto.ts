import { Transform } from 'class-transformer';
import { IsIn, IsString } from 'class-validator';

/** Data Transfer Object for OAuth login. */
export class OAuthLoginDto {
  @IsString()
  @IsIn(['google', 'github'])
  @Transform(({ value }) => value?.toLowerCase().trim())
  provider!: string;

  @IsString()
  providerToken!: string;
}
