import { IsNumberString } from 'class-validator';

export class WithdrawWalletDto {
  @IsNumberString()
  amountInCents!: string;
}
