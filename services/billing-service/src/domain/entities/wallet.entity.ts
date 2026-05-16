import { BadRequestException } from '@nestjs/common';

/** Represents the  wallet component. */
export class Wallet {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public balanceInCents: bigint,
  ) {}

  /**
   * Executes the credit operation.
   *
   * @param amountInCents - The amountInCents parameter
   */
  credit(amountInCents: bigint): void {
    if (amountInCents <= 0n) {
      throw new BadRequestException('Top-up amount must be greater than zero');
    }

    this.balanceInCents += amountInCents;
  }

  /**
   * Executes the debit operation.
   *
   * @param amountInCents - The amountInCents parameter
   */
  debit(amountInCents: bigint): void {
    if (amountInCents <= 0n) {
      throw new BadRequestException('Purchase amount must be greater than zero');
    }

    if (this.balanceInCents < amountInCents) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    this.balanceInCents -= amountInCents;
  }
}
