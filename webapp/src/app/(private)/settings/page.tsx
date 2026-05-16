import { redirect } from "next/navigation"

/** Root /settings → redirects to the billing overview. */
export default function SettingsPage() {
  redirect("/settings/billing")
}
