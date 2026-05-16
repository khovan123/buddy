import { IsString } from 'class-validator';

export class VerifyBankAccountDto {
  @IsString()
  bankBin!: string;

  @IsString()
  bankAccountNumber!: string;
}
