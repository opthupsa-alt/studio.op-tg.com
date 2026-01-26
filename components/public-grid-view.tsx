"use client"

import { useState, useMemo } from "react"
import { parseLocalDate } from "@/lib/date-utils"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { ImageIcon, Video, Film, Camera, Layers, Clock, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { PlatformIcon } from "@/components/platform-icon"
import { cn } from "@/lib/utils"
import type { Post, PostType, PostStatus } from "@/lib/types"

interface PublicGridViewProps {
  posts: Post[]
  clientColor?: string | null
}

// تصنيف نوع المحتوى
const postTypeConfig: Record<PostType, { label: string; icon: typeof ImageIcon; className: string }> = {
  post: { label: "صورة", icon: ImageIcon, className: "bg-blue-100 text-blue-700" },
  reel: { label: "ريلز", icon: Film, className: "bg-pink-100 text-pink-700" },
  video: { label: "فيديو", icon: Video, className: "bg-red-100 text-red-700" },
  story: { label: "ستوري", icon: Camera, className: "bg-purple-100 text-purple-700" },
  carousel: { label: "كاروسيل", icon: Layers, className: "bg-indigo-100 text-indigo-700" },
}

const statusConfig: Record<PostStatus, { label: string; className: string }> = {
  idea: { label: "فكرة", className: "bg-gray-100 text-gray-700" },
  draft: { label: "مسودة", className: "bg-yellow-100 text-yellow-700" },
  design: { label: "تصميم", className: "bg-purple-100 text-purple-700" },
  internal_review: { label: "مراجعة داخلية", className: "bg-blue-100 text-blue-700" },
  client_review: { label: "مراجعة العميل", className: "bg-orange-100 text-orange-700" },
  approved: { label: "معتمد", className: "bg-green-100 text-green-700" },
  rejected: { label: "مرفوض", className: "bg-red-100 text-red-700" },
  scheduled: { label: "مجدول", className: "bg-teal-100 text-teal-700" },
  posted: { label: "منشور", className: "bg-emerald-100 text-emerald-700" },
}

export function PublicGridView({ posts, clientColor }: PublicGridViewProps) {
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")

  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      const dateA = new Date(a.publish_date).getTime()
      const dateB = new Date(b.publish_date).getTime()
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB
    })
  }, [posts, sortOrder])

  const toggleSort = () => {
    setSortOrder(prev => prev === "newest" ? "oldest" : "newest")
  }

  return (
    <div className="space-y-4">
      {/* Sort Controls */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSort}
          className="gap-2"
        >
          {sortOrder === "newest" ? (
            <>
              <ArrowDown className="size-4" />
              الأحدث أولاً
            </>
          ) : (
            <>
              <ArrowUp className="size-4" />
              الأقدم أولاً
            </>
          )}
        </Button>
      </div>

      {/* Grid - RTL direction */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" dir="rtl">
        {sortedPosts.map((post) => {
        const postType = postTypeConfig[post.post_type || "post"]
        const PostTypeIcon = postType.icon
        const status = statusConfig[post.status]
        const publishDate = parseLocalDate(post.publish_date)
        const dayName = format(publishDate, "EEEE", { locale: ar })
        const formattedDate = format(publishDate, "d MMMM yyyy", { locale: ar })

        return (
          <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {/* Color indicator */}
            {clientColor && (
              <div
                className="h-1 w-full"
                style={{ backgroundColor: clientColor }}
              />
            )}

            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                {/* نوع المحتوى */}
                <Badge
                  variant="secondary"
                  className={cn("text-xs flex items-center gap-1", postType.className)}
                >
                  <PostTypeIcon className="size-3" />
                  {postType.label}
                </Badge>

                {/* الحالة */}
                <Badge variant="secondary" className={cn("text-xs", status.className)}>
                  {status.label}
                </Badge>
              </div>

              {/* العنوان */}
              <h3 className="font-semibold text-lg mt-3 line-clamp-2">
                {post.title}
              </h3>
            </CardHeader>

            <CardContent className="pb-3">
              {/* الوصف */}
              {post.description ? (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {post.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">
                  لا يوجد وصف
                </p>
              )}

              {/* المنصات */}
              {post.platforms && post.platforms.length > 0 && (
                <div className="flex items-center gap-2 mt-4">
                  {post.platforms.map((platform) => (
                    <PlatformIcon
                      key={platform.id}
                      platform={platform.key}
                      size="sm"
                    />
                  ))}
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-3 border-t bg-muted/30">
              {/* التاريخ */}
              <div className="w-full text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="size-4" />
                  <span className="font-medium">{dayName}</span>
                  <span>•</span>
                  <span>{formattedDate}</span>
                </div>
              </div>
            </CardFooter>
          </Card>
        )
      })}
      </div>
    </div>
  )
}
