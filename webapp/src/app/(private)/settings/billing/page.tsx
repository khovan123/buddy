import { PayoutAccountCard } from "@/features/billing/components/payout-account-card"
import { SubscriptionCard } from "@/features/billing/components/subscription-card"
import { TransactionTimeline } from "@/features/billing/components/transaction-timeline"
import { WalletHeroCard } from "@/features/billing/components/wallet-hero-card"
import {
  getPayoutAccount,
  getSubscription,
  getTransactions,
  getWalletBalance,
} from "@/features/billing/services/billing.service"



export default async function BillingPage() {
  const [balance, transactions, payoutAccount, subscription] =
    await Promise.all([
      getWalletBalance(),
      getTransactions(1, 10),
      getPayoutAccount(),
      getSubscription(),
    ])

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your wallet, transactions, and subscription.
        </p>
      </div>

      <WalletHeroCard balance={balance} />

      <div className="grid gap-6 lg:grid-cols-2">
        <TransactionTimeline initialData={transactions} />

        <div className="space-y-6">
          <SubscriptionCard subscription={subscription} />
          <PayoutAccountCard account={payoutAccount} />
        </div>
      </div>
    </section>
  )
}
