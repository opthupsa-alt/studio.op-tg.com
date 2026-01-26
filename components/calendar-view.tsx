"use client"

import React from "react"

import { useMemo } from "react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
} from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { PostCard } from "@/components/post-card"
import type { Post, CalendarDay } from "@/lib/types"

interface CalendarViewProps {
  currentDate: Date
  posts: Post[]
  onPostClick: (post: Post) => void
  onDayClick: (date: Date) => void
  onDragStart: (post: Post) => void
  onDragOver: (e: React.DragEvent, date: Date) => void
  onDrop: (e: React.DragEvent, date: Date) => void
}

const weekDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
const weekDaysShort = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"]

export function CalendarView({
  currentDate,
  posts,
  onPostClick,
  onDayClick,
  onDragStart,
  onDragOver,
  onDrop,
}: CalendarViewProps) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
    const today = new Date()

    return days.map((date): CalendarDay => {
      const dayPosts = posts.filter(
        (post) => post.publish_date && isSameDay(new Date(post.publish_date), date)
      )
      return {
        date,
        isCurrentMonth: isSameMonth(date, currentDate),
        isToday: isSameDay(date, today),
        posts: dayPosts,
      }
    })
  }, [currentDate, posts])

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Week days header */}
      <div className="grid grid-cols-7 border-b sticky top-0 bg-background z-10">
        {weekDays.map((day, index) => (
          <div
            key={day}
            className="py-2 sm:py-3 text-center text-xs sm:text-sm font-medium text-muted-foreground border-l first:border-l-0"
          >
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{weekDaysShort[index]}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr min-h-[500px]">
        {calendarDays.map((day, index) => (
          <div
            key={day.date.toISOString()}
            className={cn(
              "min-h-20 sm:min-h-32 p-1 sm:p-2 border-b border-l first:border-l-0 calendar-day transition-colors cursor-pointer",
              !day.isCurrentMonth && "bg-muted/30",
              day.isToday && "bg-primary/5"
            )}
            onClick={() => onDayClick(day.date)}
            onDragOver={(e) => {
              e.preventDefault()
              onDragOver(e, day.date)
            }}
            onDrop={(e) => onDrop(e, day.date)}
          >
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <span
                className={cn(
                  "text-xs sm:text-sm font-medium",
                  !day.isCurrentMonth && "text-muted-foreground",
                  day.isToday &&
                    "bg-primary text-primary-foreground rounded-full w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center text-[10px] sm:text-sm"
                )}
              >
                {format(day.date, "d")}
              </span>
              {day.posts.length > 0 && (
                <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
                  {day.posts.length} منشور
                </span>
              )}
            </div>

            <div className="space-y-1 overflow-y-auto max-h-[calc(100%-1.5rem)] sm:max-h-[calc(100%-2rem)]">
              {day.posts.slice(0, 2).map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  variant="compact"
                  onClick={() => onPostClick(post)}
                  onDragStart={() => onDragStart(post)}
                />
              ))}
              {day.posts.length > 2 && (
                <button
                  className="w-full text-[10px] sm:text-xs text-muted-foreground hover:text-foreground py-0.5 sm:py-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDayClick(day.date)
                  }}
                >
                  +{day.posts.length - 2} المزيد
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
