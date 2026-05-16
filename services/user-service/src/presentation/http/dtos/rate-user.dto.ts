// ── DTOs ────────────────────────────────────────────────────────

import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Data Transfer Object for  rate user. */
export class RateUserDto {
  @IsInt()
  @Min(1)
  @Max(5)
  score!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
