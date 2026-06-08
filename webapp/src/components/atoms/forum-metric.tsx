"use client"

export function ForumMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-16 rounded-lg px-2 py-2">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
