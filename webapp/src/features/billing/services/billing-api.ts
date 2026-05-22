import type { ApiResponse } from "@/types/api"

import { baseApi } from "../../../lib/redux/base-api"
import type {
  Subscription,
  SubscriptionPlan,
  WalletBalance,
} from "../types/billing-types"

interface TopUpWalletRequest {
  amountInCents: string
  provider: "SEPAY"
  returnUrl: string
  cancelUrl: string
}

interface TopUpWalletResponse {
  transactionId: string
  checkoutUrl: string
  externalReference: string
}

interface WithdrawWalletRequest {
  amountInCents: string
}

interface VerifyBankAccountRequest {
  bankBin: string
  bankAccountNumber: string
}

interface VerifyBankAccountResponse {
  valid: boolean
  accountName: string | null
}

interface SavePayoutAccountRequest {
  bankBin: string
  bankAccountNumber: string
  bankAccountName: string
  bankName: string
}

interface CreateSubscriptionRequest {
  plan: SubscriptionPlan
}

export const billingApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWalletBalance: build.query<ApiResponse<WalletBalance>, void>({
      query: () => ({
        url: "/v1/billing/wallet/balance",
        method: "GET",
      }),
      providesTags: ["Wallet"],
    }),

    getSubscription: build.query<ApiResponse<Subscription | null>, void>({
      query: () => ({
        url: "/v1/billing/subscription",
        method: "GET",
      }),
      providesTags: ["Subscription"],
    }),

    createSubscription: build.mutation<
      ApiResponse<Subscription>,
      CreateSubscriptionRequest
    >({
      query: (body) => ({
        url: "/v1/billing/subscription",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Subscription"],
    }),

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
  useGetWalletBalanceQuery,
  useGetSubscriptionQuery,
  useCreateSubscriptionMutation,
  useTopUpWalletMutation,
  useWithdrawWalletMutation,
  useVerifyBankAccountMutation,
  useSavePayoutAccountMutation,
} = billingApi
