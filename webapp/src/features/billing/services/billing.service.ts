import { isDynamicServerError } from "next/dist/client/components/hooks-server-context"

import { fetchApi } from "@/lib/fetch"
import { getAuthHeaders } from "@/lib/server-session"
import type { ApiResponse } from "@/types/api"

import type {
  PayoutAccount,
  Subscription,
  TransactionPage,
  WalletBalance,
} from "../types/billing-types"

export async function getWalletBalance(): Promise<WalletBalance | null> {
  try {
    const headers = await getAuthHeaders()
    const res = await fetchApi(
      "GET",
      "/billing/wallet/balance",
      undefined,
      headers,
      false,
      {
        next: { revalidate: 30, tags: ["wallet-balance"] },
      }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<WalletBalance>
    return json.data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch wallet balance:", error)
    return null
  }
}

export async function getTransactions(
  page = 1,
  limit = 20
): Promise<TransactionPage | null> {
  try {
    const headers = await getAuthHeaders()
    const res = await fetchApi(
      "GET",
      `/billing/wallet/transactions?page=${page}&limit=${limit}`,
      undefined,
      headers,
      false,
      { next: { revalidate: 30, tags: ["transactions"] } }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<TransactionPage>
    return json.data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch transactions:", error)
    return null
  }
}

export async function getPayoutAccount(): Promise<PayoutAccount | null> {
  try {
    const headers = await getAuthHeaders()
    const res = await fetchApi(
      "GET",
      "/billing/payout-account",
      undefined,
      headers,
      false,
      {
        cache: "no-store",
      }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<PayoutAccount>
    return json.data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch payout account:", error)
    return null
  }
}

export async function getSubscription(): Promise<Subscription | null> {
  try {
    const headers = await getAuthHeaders()
    const res = await fetchApi(
      "GET",
      "/billing/subscription",
      undefined,
      headers,
      false,
      {
        next: { revalidate: 60, tags: ["subscription"] },
      }
    )

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as ApiResponse<Subscription>
    return json.data ?? null
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error
    }
    console.error("Failed to fetch subscription:", error)
    return null
  }
}
