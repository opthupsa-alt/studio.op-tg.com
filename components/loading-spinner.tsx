"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DashboardSkeleton } from "@/components/skeletons"

interface LoadingSpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
  text?: string
}

const sizeClasses = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
}

export function LoadingSpinner({ className, size = "md", text }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  )
}

export function PageLoading({ text = "جاري التحميل...", view = "calendar" }: { text?: string; view?: string }) {
  return <DashboardSkeleton view={view} />
}
