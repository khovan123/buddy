import { redirect } from "next/navigation"

export default function DashboardIndexPage() {
  // Redirect to the default dashboard view
  redirect("/dashboard/majors")
}
