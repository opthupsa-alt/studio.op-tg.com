"use client"

import { useState } from "react"
import { ChevronRight, ChevronLeft, Plus, Filter, Search, Share2, Copy, Check } from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ViewSwitcher } from "@/components/view-switcher"
import type { ViewMode, Client } from "@/lib/types"

const MONTHS = [
  { value: "0", label: "يناير" },
  { value: "1", label: "فبراير" },
  { value: "2", label: "مارس" },
  { value: "3", label: "أبريل" },
  { value: "4", label: "مايو" },
  { value: "5", label: "يونيو" },
  { value: "6", label: "يوليو" },
  { value: "7", label: "أغسطس" },
  { value: "8", label: "سبتمبر" },
  { value: "9", label: "أكتوبر" },
  { value: "10", label: "نوفمبر" },
  { value: "11", label: "ديسمبر" },
]

const YEARS = Array.from({ length: 10 }, (_, i) => {
  const year = new Date().getFullYear() - 2 + i
  return { value: year.toString(), label: year.toString() }
})

interface DashboardHeaderProps {
  currentDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onDateChange: (date: Date) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onNewPost: () => void
  onFilterToggle: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedClient?: Client | null
}

export function DashboardHeader({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  onDateChange,
  viewMode,
  onViewModeChange,
  onNewPost,
  onFilterToggle,
  searchQuery,
  onSearchChange,
  selectedClient,
}: DashboardHeaderProps) {
  const [copied, setCopied] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  
  const shareUrl = selectedClient 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${selectedClient.id}/${currentDate.getFullYear()}/${currentDate.getMonth() + 1}`
    : null

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleMonthChange = (month: string) => {
    const newDate = new Date(currentDate.getFullYear(), parseInt(month), 1)
    onDateChange(newDate)
  }

  const handleYearChange = (year: string) => {
    const newDate = new Date(parseInt(year), currentDate.getMonth(), 1)
    onDateChange(newDate)
  }

  return (
    <header className="sticky top-0 z-10 flex flex-wrap h-auto min-h-14 shrink-0 items-center gap-2 border-b bg-background px-2 sm:px-4 py-2">
      <SidebarTrigger className="-mr-1" />
      <Separator orientation="vertical" className="ml-2 h-4 hidden sm:block" />
      
      {/* Month/Year Selectors */}
      <div className="flex items-center gap-1">
        <Select value={currentDate.getMonth().toString()} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-24 sm:w-28 h-8 sm:h-9 text-xs sm:text-sm font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={currentDate.getFullYear().toString()} onValueChange={handleYearChange}>
          <SelectTrigger className="w-20 sm:w-24 h-8 sm:h-9 text-xs sm:text-sm font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((year) => (
              <SelectItem key={year.value} value={year.value}>
                {year.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Navigation Arrows - السابق يمين، التالي يسار */}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="size-8 sm:size-9" onClick={onPrevMonth} title="الشهر السابق">
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="outline" size="sm" className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3" onClick={onToday}>
          اليوم
        </Button>
        <Button variant="outline" size="icon" className="size-8 sm:size-9" onClick={onNextMonth} title="الشهر التالي">
          <ChevronLeft className="size-4" />
        </Button>
      </div>

      <div className="flex-1 min-w-0" />

      <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
        <div className="relative hidden md:block">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-40 lg:w-64 pr-10"
          />
        </div>

        <ViewSwitcher value={viewMode} onChange={onViewModeChange} />

        <Button variant="outline" size="icon" className="size-8 sm:size-9" onClick={onFilterToggle}>
          <Filter className="size-4" />
        </Button>

        {selectedClient && (
          <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
                <Share2 className="size-4 ml-1 sm:ml-2" />
                <span className="hidden sm:inline">مشاركة</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>مشاركة الخطة مع العميل</DialogTitle>
                <DialogDescription>
                  شارك رابط الخطة مع العميل ليتمكن من مراجعة المنشورات والتعليق عليها
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Input 
                    value={shareUrl || ''} 
                    readOnly 
                    className="flex-1 text-sm"
                  />
                  <Button size="sm" onClick={handleCopyLink}>
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  العميل: {selectedClient.name} | الشهر: {format(currentDate, "MMMM yyyy", { locale: ar })}
                </p>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <Button onClick={onNewPost} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
          <Plus className="size-4 ml-1 sm:ml-2" />
          <span className="hidden sm:inline">منشور جديد</span>
          <span className="sm:hidden">جديد</span>
        </Button>
      </div>
    </header>
  )
}
