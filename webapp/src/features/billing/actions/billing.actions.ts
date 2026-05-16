"use server"

import { getTransactions } from "../services/billing.service"

/**
 * Server Action to fetch transactions directly from the Client Component.
 * Replaces the need for a dedicated API route handler.
 */
export async function fetchTransactionsAction(page: number, limit: number) {
  return await getTransactions(page, limit)
}
