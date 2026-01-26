import { Loader2 } from "lucide-react"

export default function SettingsLoading() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="h-16 border-b bg-background flex items-center px-4">
        <div className="h-6 w-24 bg-muted/50 rounded animate-pulse" />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري تحميل الإعدادات...</p>
        </div>
      </div>
    </div>
  )
}
