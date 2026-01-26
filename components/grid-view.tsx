"use client"

import { PostCard } from "@/components/post-card"
import type { Post } from "@/lib/types"

interface GridViewProps {
  posts: Post[]
  onPostClick: (post: Post) => void
}

export function GridView({ posts, onPostClick }: GridViewProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <p className="text-base sm:text-lg">لا توجد منشورات</p>
        <p className="text-xs sm:text-sm">ابدأ بإنشاء منشور جديد</p>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 overflow-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            variant="full"
            onClick={() => onPostClick(post)}
          />
        ))}
      </div>
    </div>
  )
}
