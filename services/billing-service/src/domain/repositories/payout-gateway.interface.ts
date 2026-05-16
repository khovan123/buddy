export type VerifyBankAccountInput = {
  bankBin: string;
  accountNumber: string;
};

export type VerifyBankAccountResult = {
  valid: boolean;
  accountName: string | null;
};

export type CreatePayoutInput = {
  referenceId: string;
  amount: number;
  description: string;
  toBin: string;
  toAccountNumber: string;
};

export type CreatePayoutResult = {
  payoutId: string;
  state: string;
};

/** Interface for payout (chi) operations via a payment gateway. */
export interface IPayoutGateway {
  verifyBankAccount(input: VerifyBankAccountInput): Promise<VerifyBankAccountResult>;
  createPayout(input: CreatePayoutInput): Promise<CreatePayoutResult>;
}
