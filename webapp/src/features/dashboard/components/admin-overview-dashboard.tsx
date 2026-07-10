import { ArrowDownToLine, ArrowUpFromLine, FileText, Users } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import type { AdminOverview } from "../services/admin-overview.service"

function formatCurrency(value: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value))
}

const statCards = (overview: AdminOverview) => [
  { title: "Tổng người dùng", value: overview.users.total, icon: Users },
  { title: "Creator", value: overview.users.creators, icon: Users },
  { title: "Student", value: overview.users.students, icon: Users },
  { title: "Tổng bài đăng", value: overview.posts.total, icon: FileText },
]

export function AdminOverviewDashboard({
  overview,
}: {
  overview: AdminOverview | null
}) {
  if (!overview) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Không thể tải số liệu tổng hợp.
      </div>
    )
  }

  return (
    <section className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Tổng quan vận hành Buddy.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards(overview).map(({ title, value, icon: Icon }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {value.toLocaleString("vi-VN")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDownToLine className="size-4" />
              Tiền vào
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(overview.billing.moneyInCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpFromLine className="size-4" />
              Tiền rút
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(overview.billing.moneyOutCents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Doanh thu billing</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(overview.billing.billingRevenueCents)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top creator theo thu nhập</CardTitle>
        </CardHeader>
        <CardContent>
          {overview.billing.creatorLeaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa có thu nhập creator.
            </p>
          ) : (
            <ol className="space-y-3">
              {overview.billing.creatorLeaderboard.map((creator, index) => (
                <li
                  key={creator.userId}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <strong className="mr-2">#{index + 1}</strong>
                    {creator.userId}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(creator.earningsCents)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
