"use client"

import { Calendar, LayoutGrid, Kanban, List, Grid3X3, Instagram } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ViewMode } from "@/lib/types"

interface ViewSwitcherProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
}

const views = [
  { value: "calendar" as const, icon: Calendar, label: "التقويم" },
  { value: "grid" as const, icon: LayoutGrid, label: "الشبكة" },
  { value: "kanban" as const, icon: Kanban, label: "كانبان" },
  { value: "list" as const, icon: List, label: "القائمة" },
  { value: "monthly-grid" as const, icon: Grid3X3, label: "الشبكة الشهرية" },
  { value: "instagram" as const, icon: Instagram, label: "عرض إنستجرام" },
]

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <TooltipProvider>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as ViewMode)}
        className="bg-muted p-0.5 sm:p-1 rounded-lg"
      >
        {views.map((view) => (
          <Tooltip key={view.value}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value={view.value}
                aria-label={view.label}
                className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm size-7 sm:size-8"
              >
                <view.icon className="size-3.5 sm:size-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>
              <p>{view.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </TooltipProvider>
  )
}
