"use client"

import { parseLocalDate } from "@/lib/date-utils"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { ImageIcon, Video, Images, FileText, Sparkles, Clock, Film, Camera, Layers } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { PlatformIcon } from "@/components/platform-icon"
import type { Post, PostStatus, PostType } from "@/lib/types"

// تصنيف نوع المحتوى
const postTypeConfig: Record<PostType, { label: string; icon: typeof ImageIcon; className: string }> = {
  post: { label: "صورة", icon: ImageIcon, className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  reel: { label: "ريلز", icon: Film, className: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  video: { label: "فيديو", icon: Video, className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  story: { label: "ستوري", icon: Camera, className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  carousel: { label: "كاروسيل", icon: Layers, className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
}

interface PostCardProps {
  post: Post
  variant?: "compact" | "full" | "kanban"
  onClick?: () => void
  onDragStart?: () => void
}

const statusConfig: Record<PostStatus, { label: string; className: string }> = {
  idea: { label: "فكرة", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  draft: { label: "مسودة", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  design: { label: "تصميم", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  internal_review: { label: "مراجعة داخلية", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  client_review: { label: "مراجعة العميل", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  approved: { label: "معتمد", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "مرفوض", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  scheduled: { label: "مجدول", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  posted: { label: "منشور", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
}

const goalConfig: Record<string, { label: string; className: string }> = {
  awareness: { label: "الوعي", className: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
  engagement: { label: "التفاعل", className: "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400" },
  leads: { label: "عملاء محتملين", className: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
  messages: { label: "رسائل", className: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400" },
  sales: { label: "مبيعات", className: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" },
}

export function PostCard({ post, variant = "full", onClick, onDragStart }: PostCardProps) {
  const status = statusConfig[post.status]
  const goal = post.main_goal ? goalConfig[post.main_goal] : null

  if (variant === "compact") {
    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("postId", post.id)
          onDragStart?.()
        }}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.()
        }}
        className={cn(
          "p-2 rounded-md border bg-card cursor-pointer hover:shadow-sm transition-shadow",
          "flex items-center gap-2"
        )}
      >
        <div
          className="w-1 h-8 rounded-full shrink-0"
          style={{ backgroundColor: post.client?.brand_primary_color || "var(--primary)" }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{post.title}</p>
          <div className="flex items-center gap-1 mt-0.5">
            {post.platforms?.slice(0, 2).map((platform) => (
              <PlatformIcon
                key={platform.id}
                platform={platform.name}
                size="xs"
              />
            ))}
            {(post.platforms?.length || 0) > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{(post.platforms?.length || 0) - 2}
              </span>
            )}
          </div>
        </div>
        <Badge variant="secondary" className={cn("text-[10px] h-5", status.className)}>
          {status.label}
        </Badge>
      </div>
    )
  }

  if (variant === "kanban") {
    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("postId", post.id)
          onDragStart?.()
        }}
        onClick={onClick}
        className="p-3 rounded-lg border bg-card cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-2">
          <div
            className="w-2 h-2 rounded-full shrink-0 mt-1.5"
            style={{ backgroundColor: post.client?.brand_primary_color || "var(--primary)" }}
          />
          <Badge variant="secondary" className={cn("text-xs", status.className)}>
            {status.label}
          </Badge>
        </div>
        <h4 className="font-medium text-sm mb-2 line-clamp-2">{post.title}</h4>
        {goal && (
          <Badge variant="outline" className={cn("text-xs mb-2", goal.className)}>
            {goal.label}
          </Badge>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {post.platforms?.map((platform) => (
              <PlatformIcon
                key={platform.id}
                platform={platform.key}
                size="sm"
              />
            ))}
          </div>
          {post.publish_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {format(parseLocalDate(post.publish_date), "d MMM", { locale: ar })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Full variant
  const postType = postTypeConfig[post.post_type || "post"]
  const PostTypeIcon = postType.icon
  
  // Get first image from assets
  const firstImage = post.assets?.find((a: any) => a.type === "image")

  return (
    <div
      onClick={onClick}
      className="rounded-xl border bg-card cursor-pointer hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full"
    >
      {/* Post Image */}
      {firstImage ? (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img 
            src={firstImage.url} 
            alt={post.title} 
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
          <PostTypeIcon className="size-12 text-muted-foreground/30" />
        </div>
      )}
      
      <div className="p-4 flex flex-col flex-1">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: post.client?.brand_primary_color || "var(--primary)" }}
          />
          <span className="text-sm text-muted-foreground">
            {post.client?.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* نوع المحتوى */}
          <Badge variant="secondary" className={cn("text-xs flex items-center gap-1", postType.className)}>
            <PostTypeIcon className="size-3" />
            {postType.label}
          </Badge>
          {/* الحالة */}
          <Badge variant="secondary" className={cn("text-xs", status.className)}>
            {status.label}
          </Badge>
        </div>
      </div>

      <h3 className="font-semibold text-base mb-2">{post.title}</h3>
      
      {goal && (
        <Badge variant="outline" className={cn("text-xs mb-3", goal.className)}>
          {goal.label}
        </Badge>
      )}

      <div className="flex items-center justify-between pt-3 border-t mt-auto">
        <div className="flex items-center gap-1">
          {post.platforms?.map((platform) => (
            <PlatformIcon
              key={platform.id}
              platform={platform.key}
              size="sm"
            />
          ))}
        </div>
        {post.publish_date && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-4" />
            {format(parseLocalDate(post.publish_date), "d MMMM yyyy", { locale: ar })}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
