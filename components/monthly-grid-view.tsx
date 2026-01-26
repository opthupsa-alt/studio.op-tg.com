"use client"

import { useMemo, useState } from "react"
import { parseLocalDate } from "@/lib/date-utils"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { Search, Filter, Image, Video, FileText, Layers, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { PlatformIcon } from "@/components/platform-icon"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Post, Platform, PostStatus, PostType } from "@/lib/types"
import {
  STATUS_LABELS,
  STATUS_COLORS,
  POST_TYPE_LABELS,
  POST_TYPE_COLORS,
} from "@/lib/types"
import { cn } from "@/lib/utils"

// Fallback values for posts without new columns
const getPostType = (post: Post): PostType => post.post_type || "post"
const getPostDescription = (post: Post): string | null => post.description || null

interface MonthlyGridViewProps {
  posts: Post[]
  platforms: Platform[]
  onPostClick: (post: Post) => void
}

export function MonthlyGridView({ posts, platforms, onPostClick }: MonthlyGridViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [platformFilter, setPlatformFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = post.title.toLowerCase().includes(query)
        const matchesDescription = post.description?.toLowerCase().includes(query)
        if (!matchesTitle && !matchesDescription) return false
      }

      // Status filter
      if (statusFilter !== "all" && post.status !== statusFilter) {
        return false
      }

      // Platform filter
      if (platformFilter !== "all") {
        const hasPlatform = post.platforms?.some((p) => p.id === platformFilter)
        if (!hasPlatform) return false
      }

      // Type filter
      if (typeFilter !== "all" && getPostType(post) !== typeFilter) {
        return false
      }

      return true
    })
  }, [posts, searchQuery, statusFilter, platformFilter, typeFilter])

  // Sort by publish_date
  const sortedPosts = useMemo(() => {
    return [...filteredPosts].sort((a, b) => 
      new Date(a.publish_date).getTime() - new Date(b.publish_date).getTime()
    )
  }, [filteredPosts])

  const statuses: PostStatus[] = [
    "idea", "draft", "design", "internal_review", 
    "client_review", "approved", "rejected", "scheduled", "posted"
  ]

  const postTypes: PostType[] = ["post", "reel", "video", "story", "carousel"]

  return (
    <div className="flex flex-col h-full">
      {/* Filters Bar */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="بحث في المنشورات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Platform Filter */}
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="المنصة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المنصات</SelectItem>
              {platforms.map((platform) => (
                <SelectItem key={platform.id} value={platform.id}>
                  {platform.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="النوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              {postTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {POST_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Results count */}
          <span className="text-sm text-muted-foreground">
            {sortedPosts.length} منشور
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4">
        {sortedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Filter className="size-12 mb-4 opacity-50" />
            <p className="text-lg">لا توجد منشورات</p>
            <p className="text-sm">جرب تغيير الفلاتر أو إضافة منشور جديد</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedPosts.map((post) => (
              <MonthlyGridCard
                key={post.id}
                post={post}
                onClick={() => onPostClick(post)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface MonthlyGridCardProps {
  post: Post
  onClick: () => void
}

function MonthlyGridCard({ post, onClick }: MonthlyGridCardProps) {
  const publishDate = parseLocalDate(post.publish_date)
  const dayName = format(publishDate, "EEEE", { locale: ar })
  const formattedDate = format(publishDate, "d MMMM yyyy", { locale: ar })
  const postType = getPostType(post)
  const description = getPostDescription(post)

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 group relative overflow-hidden"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          {/* Post Type Badge */}
          <Badge
            variant="secondary"
            className={cn(
              "text-xs font-medium",
              POST_TYPE_COLORS[postType]
            )}
          >
            {POST_TYPE_LABELS[postType]}
          </Badge>

          {/* Status Badge */}
          <Badge
            variant="secondary"
            className={cn("text-xs", STATUS_COLORS[post.status])}
          >
            {STATUS_LABELS[post.status]}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base line-clamp-2 mt-2 group-hover:text-primary transition-colors">
          {post.title}
        </h3>
      </CardHeader>

      <CardContent className="pb-2">
        {/* Description Preview */}
        {description ? (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/50 italic">
            لا يوجد وصف
          </p>
        )}

        {/* Platforms */}
        {post.platforms && post.platforms.length > 0 && (
          <div className="flex items-center gap-1 mt-3">
            {post.platforms.slice(0, 4).map((platform) => (
              <PlatformIcon
                key={platform.id}
                platform={platform.key}
                size="sm"
              />
            ))}
            {post.platforms.length > 4 && (
              <span className="text-xs text-muted-foreground">
                +{post.platforms.length - 4}
              </span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 border-t">
        {/* Date Footer */}
        <div className="w-full text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {dayName} • {formattedDate}
          </p>
        </div>
      </CardFooter>

      {/* Client Color Indicator */}
      {post.client?.brand_primary_color && (
        <div
          className="absolute top-0 right-0 w-1 h-full rounded-r-lg"
          style={{ backgroundColor: post.client.brand_primary_color }}
        />
      )}
    </Card>
  )
}
