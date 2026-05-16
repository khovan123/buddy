import TransactionHistoryPage from "@/features/billing/components/transaction-history-page"
import { getTransactions } from "@/features/billing/services/billing.service"


export default async function TransactionsPage() {
  const initialData = await getTransactions(1, 20)

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View your complete transaction history.
        </p>
      </div>

      <TransactionHistoryPage initialData={initialData} />
    </section>
  )
}
