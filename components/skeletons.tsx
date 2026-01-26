"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function PostCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="h-5 w-3/4 mt-2" />
      </CardHeader>
      <CardContent className="pb-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3 mt-1" />
        <div className="flex items-center gap-1 mt-3">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      </CardContent>
      <div className="border-t p-3">
        <Skeleton className="h-4 w-1/2 mx-auto" />
      </div>
    </Card>
  )
}

export function MonthlyGridSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Filters Bar Skeleton */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-[200px]" />
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function CalendarSkeleton() {
  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square p-1">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function KanbanSkeleton() {
  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Work Section */}
      <div className="min-h-[300px]">
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[280px]">
              <Skeleton className="h-10 w-full rounded-t-lg" />
              <div className="bg-muted/30 rounded-b-lg p-2 min-h-[200px] space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-24 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Skeleton className="h-px w-full" />

      {/* Review Section */}
      <div className="min-h-[300px]">
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[280px]">
              <Skeleton className="h-10 w-full rounded-t-lg" />
              <div className="bg-muted/30 rounded-b-lg p-2 min-h-[200px] space-y-2">
                {Array.from({ length: 2 }).map((_, j) => (
                  <Skeleton key={j} className="h-24 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ListSkeleton() {
  return (
    <div className="p-4 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-4 p-3 border-b">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Rows */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border-b">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-1">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SidePanelSkeleton() {
  return (
    <div className="p-4 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 flex-1" />
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Title Field */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>

        {/* Content Field */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-32 w-full" />
        </div>

        {/* Post Type */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>

        {/* Goal */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton({ view = "calendar" }: { view?: string }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header Skeleton */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-[180px]" />
            <Skeleton className="h-9 w-[140px]" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>

      {/* Content Skeleton based on view */}
      <div className="flex-1 overflow-hidden">
        {view === "calendar" && <CalendarSkeleton />}
        {view === "grid" && <MonthlyGridSkeleton />}
        {view === "kanban" && <KanbanSkeleton />}
        {view === "list" && <ListSkeleton />}
        {view === "monthly" && <MonthlyGridSkeleton />}
      </div>
    </div>
  )
}
