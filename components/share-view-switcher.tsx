"use client"

import { useState } from "react"
import { LayoutGrid, Instagram } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PublicGridView } from "@/components/public-grid-view"
import { InstagramMockup } from "@/components/instagram-mockup"
import type { Post, Client } from "@/lib/types"

interface ShareViewSwitcherProps {
  posts: Post[]
  client: Client | null
}

export function ShareViewSwitcher({ posts, client }: ShareViewSwitcherProps) {
  const [viewMode, setViewMode] = useState<"grid" | "instagram">("grid")

  return (
    <div>
      {/* View Toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-muted rounded-lg p-1 gap-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className={cn(
              "gap-2",
              viewMode === "grid" && "shadow-sm"
            )}
          >
            <LayoutGrid className="size-4" />
            عرض الشبكة
          </Button>
          <Button
            variant={viewMode === "instagram" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("instagram")}
            className={cn(
              "gap-2",
              viewMode === "instagram" && "shadow-sm"
            )}
          >
            <Instagram className="size-4" />
            عرض إنستجرام
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "grid" ? (
        <PublicGridView posts={posts} clientColor={client?.brand_primary_color} />
      ) : (
        <div className="flex justify-center">
          <InstagramMockup 
            posts={posts} 
            client={client}
            showApprovalBadges={true}
          />
        </div>
      )}
    </div>
  )
}
