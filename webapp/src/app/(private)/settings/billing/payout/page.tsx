import { PayoutSetupPage, getPayoutAccount } from "@/features/billing"


export default async function PayoutPage() {
  const payoutAccount = await getPayoutAccount()

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payout Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up and verify your bank account to receive payouts.
        </p>
      </div>

      <PayoutSetupPage initialAccount={payoutAccount} />
    </section>
  )
}
