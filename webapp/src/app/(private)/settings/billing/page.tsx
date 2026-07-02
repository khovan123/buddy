import {
  PayoutAccountCard,
  SubscriptionCard,
  TransactionTimeline,
  WalletHeroCard,
  getPayoutAccount,
  getSubscription,
  getSubscriptionPlanCatalog,
  getTransactions,
  getWalletBalance,
} from "@/features/billing"
import { getServerTranslator } from "@/i18n/server"



export default async function BillingPage() {
  const [balance, transactions, payoutAccount, subscription, planCatalog, { t }] =
    await Promise.all([
      getWalletBalance(),
      getTransactions(1, 10),
      getPayoutAccount(),
      getSubscription(),
      getSubscriptionPlanCatalog(),
      getServerTranslator(),
    ])

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("billing.page.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("billing.page.description")}
        </p>
      </div>

      <WalletHeroCard balance={balance} />

      <div className="grid gap-6 lg:grid-cols-2">
        <TransactionTimeline initialData={transactions} />

        <div className="space-y-6">
          <SubscriptionCard
            subscription={subscription}
            planCatalog={planCatalog}
          />
          <PayoutAccountCard account={payoutAccount} />
        </div>
      </div>
    </section>
  )
}
