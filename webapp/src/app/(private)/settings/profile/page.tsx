import { CalendarDays, Mail, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfileSettingsCard } from "@/features/user/components/profile-settings-card"
import { getMe } from "@/features/user/services/user.service"

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default async function SettingsProfilePage() {
  const user = await getMe()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <UserRound className="size-4" />
          Account profile
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Keep your public identity and learning context current so
          recommendations, creator tools, and billing records stay aligned.
        </p>
      </div>

      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
              Account
            </CardTitle>
            <p className="mt-2 text-xl font-semibold">
              {user?.profile?.nickname ?? user?.nickname ?? "Unnamed user"}
            </p>
          </div>
          <Badge variant={user?.isActive ? "default" : "secondary"}>
            {user?.isActive ? "Active" : "Inactive"}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
            <Mail className="size-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Email</p>
              <p className="truncate font-medium">
                {user?.email ?? "Not available"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
            <CalendarDays className="size-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Member since
              </p>
              <p className="font-medium">
                {user?.createdAt ? formatDate(user.createdAt) : "Not available"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProfileSettingsCard user={user} />
    </div>
  )
}
