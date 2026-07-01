import { Loader2 } from "lucide-react"

export default function GlobalLoading() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <div className="flex items-center justify-center rounded-full bg-primary/10 p-4">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
      <div className="space-y-1 text-center">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          Đang tải
        </h3>
        <p className="text-sm text-muted-foreground animate-pulse">
          Vui lòng chờ trong giây lát...
        </p>
      </div>
    </div>
  )
}
