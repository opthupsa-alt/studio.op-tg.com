"use client"

import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { MoreHorizontal, Eye, Edit, Trash2, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PlatformIcon } from "@/components/platform-icon"
import type { Post, PostStatus } from "@/lib/types"

interface ListViewProps {
  posts: Post[]
  onPostClick: (post: Post) => void
  onDelete?: (postId: string) => void
  selectedPosts: string[]
  onSelectPost: (postId: string) => void
  onSelectAll: () => void
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

export function ListView({
  posts,
  onPostClick,
  onDelete,
  selectedPosts,
  onSelectPost,
  onSelectAll,
}: ListViewProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <p className="text-lg">لا توجد منشورات</p>
        <p className="text-sm">ابدأ بإنشاء منشور جديد</p>
      </div>
    )
  }

  const allSelected = posts.length > 0 && selectedPosts.length === posts.length

  return (
    <div className="p-2 sm:p-6 overflow-auto">
      <div className="rounded-lg border overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 sm:w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="تحديد الكل"
                />
              </TableHead>
              <TableHead className="min-w-[150px]">العنوان</TableHead>
              <TableHead className="hidden sm:table-cell">العميل</TableHead>
              <TableHead className="hidden md:table-cell">المنصات</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="hidden sm:table-cell">تاريخ النشر</TableHead>
              <TableHead className="w-10 sm:w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts.map((post) => {
              const status = statusConfig[post.status]
              const isSelected = selectedPosts.includes(post.id)

              return (
                <TableRow
                  key={post.id}
                  className={cn("cursor-pointer", isSelected && "bg-muted/50")}
                  onClick={() => onPostClick(post)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onSelectPost(post.id)}
                      aria-label={`تحديد ${post.title}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-8 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            post.client?.brand_primary_color || "var(--primary)",
                        }}
                      />
                      <div>
                        <p className="font-medium">{post.title}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-xs sm:text-sm">
                      {post.client?.name || "-"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      {post.platforms?.slice(0, 3).map((platform) => (
                        <PlatformIcon
                          key={platform.id}
                          platform={platform.key}
                          size="sm"
                        />
                      ))}
                      {(post.platforms?.length || 0) > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{(post.platforms?.length || 0) - 3}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("text-[10px] sm:text-xs", status.className)}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {post.publish_date ? (
                      <span className="text-xs sm:text-sm">
                        {format(new Date(post.publish_date), "d MMM yyyy", { locale: ar })}
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onPostClick(post)}>
                          <Eye className="ml-2 size-4" />
                          عرض
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPostClick(post)}>
                          <Edit className="ml-2 size-4" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Send className="ml-2 size-4" />
                          إرسال للمراجعة
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete?.(post.id)}
                        >
                          <Trash2 className="ml-2 size-4" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
