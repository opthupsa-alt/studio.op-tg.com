"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PlatformIcon } from "@/components/platform-icon"
import type { FilterState, Platform, Client, PostStatus, MainGoal } from "@/lib/types"

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  platforms: Platform[]
  clients: Client[]
  onReset: () => void
}

const statusOptions: { value: PostStatus; label: string }[] = [
  { value: "idea", label: "فكرة" },
  { value: "draft", label: "مسودة" },
  { value: "design", label: "تصميم" },
  { value: "internal_review", label: "مراجعة داخلية" },
  { value: "client_review", label: "مراجعة العميل" },
  { value: "approved", label: "معتمد" },
  { value: "scheduled", label: "مجدول" },
  { value: "posted", label: "منشور" },
]

const goalOptions: { value: MainGoal; label: string }[] = [
  { value: "awareness", label: "الوعي" },
  { value: "engagement", label: "التفاعل" },
  { value: "leads", label: "عملاء محتملين" },
  { value: "messages", label: "رسائل" },
  { value: "sales", label: "مبيعات" },
]

const contentTypeOptions = [
  { value: "text", label: "نص" },
  { value: "image", label: "صورة" },
  { value: "video", label: "فيديو" },
  { value: "audio", label: "صوت" },
  { value: "link", label: "رابط" },
]

export function FilterPanel({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  platforms,
  clients,
  onReset,
}: FilterPanelProps) {
  const toggleArrayFilter = <K extends keyof FilterState>(
    key: K,
    value: string
  ) => {
    const currentArray = filters[key] as string[]
    const newArray = currentArray.includes(value)
      ? currentArray.filter((v) => v !== value)
      : [...currentArray, value]
    onFiltersChange({ ...filters, [key]: newArray })
  }

  const activeFilterCount =
    filters.clients.length +
    filters.platforms.length +
    filters.statuses.length +
    filters.goals.length

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="left" className="w-80 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle>الفلاتر</SheetTitle>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={onReset}>
                  إعادة تعيين ({activeFilterCount})
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Clients */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">العملاء</Label>
              <div className="space-y-2">
                {clients.map((client) => (
                  <div key={client.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`client-${client.id}`}
                      checked={filters.clients.includes(client.id)}
                      onCheckedChange={() => toggleArrayFilter("clients", client.id)}
                    />
                    <label
                      htmlFor={`client-${client.id}`}
                      className="text-sm cursor-pointer flex items-center gap-2"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: client.brand_primary_color || "var(--primary)" }}
                      />
                      {client.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Platforms */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">المنصات</Label>
              <div className="space-y-2">
                {platforms.map((platform) => (
                  <div key={platform.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`platform-${platform.id}`}
                      checked={filters.platforms.includes(platform.id)}
                      onCheckedChange={() => toggleArrayFilter("platforms", platform.id)}
                    />
                    <label
                      htmlFor={`platform-${platform.id}`}
                      className="text-sm cursor-pointer flex items-center gap-2"
                    >
                      <PlatformIcon platform={platform.key} size="xs" />
                      {platform.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">الحالة</Label>
              <div className="space-y-2">
                {statusOptions.map((status) => (
                  <div key={status.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`status-${status.value}`}
                      checked={filters.statuses.includes(status.value)}
                      onCheckedChange={() => toggleArrayFilter("statuses", status.value)}
                    />
                    <label
                      htmlFor={`status-${status.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {status.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Goals */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">الهدف</Label>
              <div className="space-y-2">
                {goalOptions.map((goal) => (
                  <div key={goal.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`goal-${goal.value}`}
                      checked={filters.goals.includes(goal.value)}
                      onCheckedChange={() => toggleArrayFilter("goals", goal.value)}
                    />
                    <label
                      htmlFor={`goal-${goal.value}`}
                      className="text-sm cursor-pointer"
                    >
                      {goal.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t shrink-0">
          <Button className="w-full" onClick={onClose}>
            تطبيق الفلاتر
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
