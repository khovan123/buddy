import type { ApiResponse } from "@/types/api"

import { baseApi } from "../../../lib/redux/base-api"

interface TopUpWalletRequest {
  amountInCents: string
  provider: "PAYOS" | "PAYPAL"
  returnUrl: string
  cancelUrl: string
}

interface TopUpWalletResponse {
  paymentLink: string
}

interface WithdrawWalletRequest {
  amountInCents: string
}

interface VerifyBankAccountRequest {
  bankBin: string
  bankAccountNumber: string
}

interface VerifyBankAccountResponse {
  accountName: string
  accountNumber: string
}

interface SavePayoutAccountRequest {
  bankBin: string
  bankAccountNumber: string
  bankAccountName: string
  bankName: string
}

export const billingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    topUpWallet: build.mutation<
      ApiResponse<TopUpWalletResponse>,
      TopUpWalletRequest
    >({
      query: (body) => ({
        url: "/v1/billing/wallet/top-up",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Wallet", "Transaction"],
    }),

    withdrawWallet: build.mutation<
      ApiResponse<unknown>,
      WithdrawWalletRequest & { idempotencyKey?: string }
    >({
      query: ({ idempotencyKey, ...body }) => ({
        url: "/v1/billing/wallet/withdraw",
        method: "POST",
        body,
        headers: idempotencyKey
          ? { "x-idempotency-key": idempotencyKey }
          : undefined,
      }),
      invalidatesTags: ["Wallet", "Transaction"],
    }),

    verifyBankAccount: build.mutation<
      ApiResponse<VerifyBankAccountResponse>,
      VerifyBankAccountRequest
    >({
      query: (body) => ({
        url: "/v1/billing/payout-account/verify",
        method: "POST",
        body,
      }),
    }),

    savePayoutAccount: build.mutation<
      ApiResponse<unknown>,
      SavePayoutAccountRequest
    >({
      query: (body) => ({
        url: "/v1/billing/payout-account",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["PayoutAccount"],
    }),
  }),
})

export const {
  useTopUpWalletMutation,
  useWithdrawWalletMutation,
  useVerifyBankAccountMutation,
  useSavePayoutAccountMutation,
} = billingApi
