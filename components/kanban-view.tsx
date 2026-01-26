"use client"

import React from "react"

import { cn } from "@/lib/utils"
import { PostCard } from "@/components/post-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Post, PostStatus } from "@/lib/types"

interface KanbanViewProps {
  posts: Post[]
  onPostClick: (post: Post) => void
  onDragStart: (post: Post) => void
  onDragOver: (e: React.DragEvent, status: PostStatus) => void
  onDrop: (e: React.DragEvent, status: PostStatus) => void
  canDrag?: boolean
}

// القسم العلوي: مراحل العمل الداخلي
const workColumns: { status: PostStatus; label: string; color: string }[] = [
  { status: "idea", label: "أفكار", color: "bg-gray-100 dark:bg-gray-800" },
  { status: "draft", label: "مسودات", color: "bg-yellow-50 dark:bg-yellow-900/20" },
  { status: "design", label: "تصميم", color: "bg-purple-50 dark:bg-purple-900/20" },
  { status: "internal_review", label: "مراجعة داخلية", color: "bg-blue-50 dark:bg-blue-900/20" },
]

// القسم السفلي: مراحل المراجعة والنشر
const reviewColumns: { status: PostStatus; label: string; color: string }[] = [
  { status: "client_review", label: "بانتظار المراجعة", color: "bg-orange-50 dark:bg-orange-900/20" },
  { status: "approved", label: "الموافقة", color: "bg-green-50 dark:bg-green-900/20" },
  { status: "scheduled", label: "مجدول للنشر", color: "bg-teal-50 dark:bg-teal-900/20" },
  { status: "posted", label: "تم النشر", color: "bg-emerald-50 dark:bg-emerald-900/20" },
]

function KanbanColumn({
  status,
  label,
  color,
  posts,
  onPostClick,
  onDragStart,
  onDragOver,
  onDrop,
  canDrag = true,
}: {
  status: PostStatus
  label: string
  color: string
  posts: Post[]
  onPostClick: (post: Post) => void
  onDragStart: (post: Post) => void
  onDragOver: (e: React.DragEvent, status: PostStatus) => void
  onDrop: (e: React.DragEvent, status: PostStatus) => void
  canDrag?: boolean
}) {
  const columnPosts = posts.filter((post) => post.status === status)

  return (
    <div
      className="flex flex-col flex-shrink-0 w-[200px] sm:w-[250px] md:w-[280px] snap-start"
      onDragOver={(e) => {
        if (!canDrag) return
        e.preventDefault()
        e.stopPropagation()
        onDragOver(e, status)
      }}
      onDrop={(e) => {
        if (!canDrag) return
        e.preventDefault()
        e.stopPropagation()
        onDrop(e, status)
      }}
    >
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded-t-lg",
          color
        )}
      >
        <span className="font-medium text-sm">{label}</span>
        <span className="text-xs text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full">
          {columnPosts.length}
        </span>
      </div>

      <ScrollArea className="flex-1 bg-muted/30 rounded-b-lg p-2 min-h-[200px]">
        <div className="space-y-2">
          {columnPosts.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
              {canDrag ? "اسحب المنشورات هنا" : "لا توجد منشورات"}
            </div>
          ) : (
            columnPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                variant="kanban"
                onClick={() => onPostClick(post)}
                onDragStart={canDrag ? () => onDragStart(post) : undefined}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export function KanbanView({
  posts,
  onPostClick,
  onDragStart,
  onDragOver,
  onDrop,
  canDrag = true,
}: KanbanViewProps) {
  return (
    <div className="flex flex-col h-full p-2 sm:p-4 gap-4 overflow-auto">
      {/* القسم العلوي: مراحل العمل */}
      <div className="min-h-[300px] sm:min-h-[350px]">
        <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3 px-2">
          مراحل العمل
        </h3>
        <div className="flex gap-2 sm:gap-4 h-[calc(100%-2rem)] overflow-x-auto pb-2 snap-x snap-mandatory">
          {workColumns.map((column) => (
            <KanbanColumn
              key={column.status}
              status={column.status}
              label={column.label}
              color={column.color}
              posts={posts}
              onPostClick={onPostClick}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              canDrag={canDrag}
            />
          ))}
        </div>
      </div>

      {/* فاصل */}
      <div className="border-t border-border shrink-0" />

      {/* القسم السفلي: مراحل المراجعة والنشر */}
      <div className="min-h-[300px] sm:min-h-[350px]">
        <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 sm:mb-3 px-2">
          المراجعة والنشر
        </h3>
        <div className="flex gap-2 sm:gap-4 h-[calc(100%-2rem)] overflow-x-auto pb-2 snap-x snap-mandatory">
          {reviewColumns.map((column) => (
            <KanbanColumn
              key={column.status}
              status={column.status}
              label={column.label}
              color={column.color}
              posts={posts}
              onPostClick={onPostClick}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              canDrag={canDrag}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
