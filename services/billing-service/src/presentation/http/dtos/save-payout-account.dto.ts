import { IsString } from 'class-validator';

export class SavePayoutAccountDto {
  @IsString()
  bankBin!: string;

  @IsString()
  bankAccountNumber!: string;

  @IsString()
  bankAccountName!: string;

  @IsString()
  bankName!: string;
}
