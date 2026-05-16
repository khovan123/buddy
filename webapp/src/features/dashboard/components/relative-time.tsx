"use client"

import { useEffect, useState } from "react"

import { formatRelativeTime } from "@/features/dashboard/utils/formatters"

export function RelativeTime({ date }: { date: string }) {
  // Khởi tạo state ngay lập tức
  const [now, setNow] = useState<number>(() => new Date().getTime())

  useEffect(() => {
    // Chỉ set interval trong effect, không gọi setNow() đồng bộ
    const interval = setInterval(() => setNow(new Date().getTime()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Dùng suppressHydrationWarning để React bỏ qua cảnh báo lệch thời gian giữa Server và Client
  return <span suppressHydrationWarning>{formatRelativeTime(date, now)}</span>
}
