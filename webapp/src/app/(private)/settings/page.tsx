import { redirect } from "next/navigation"

/** Root /settings redirects to the account profile. */
export default function SettingsPage() {
  redirect("/settings/profile")
}
