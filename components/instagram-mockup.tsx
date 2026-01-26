"use client"

import { useState, useMemo } from "react"
import { parseLocalDate } from "@/lib/date-utils"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { 
  ImageIcon, 
  Video, 
  Film, 
  Camera, 
  Layers, 
  Play,
  Grid3X3,
  Bookmark,
  Heart,
  MessageCircle,
  Send,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  XCircle,
  Clock3
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { Post, PostType, PostStatus, Client } from "@/lib/types"

interface InstagramMockupProps {
  posts: Post[]
  client: Client | null
  showApprovalBadges?: boolean
}

const POST_TYPE_ICONS: Record<PostType, typeof ImageIcon> = {
  post: ImageIcon,
  reel: Film,
  video: Video,
  story: Camera,
  carousel: Layers,
}

const DEFAULT_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='48'%3E📷%3C/text%3E%3C/svg%3E"

export function InstagramMockup({ posts, client, showApprovalBadges = true }: InstagramMockupProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<"posts" | "reels">("posts")

  // فصل المنشورات حسب النوع
  const { regularPosts, reelsPosts } = useMemo(() => {
    const regular: Post[] = []
    const reels: Post[] = []
    
    posts.forEach(post => {
      if (post.post_type === "reel" || post.post_type === "video") {
        reels.push(post)
      } else {
        regular.push(post)
      }
    })
    
    // ترتيب حسب التاريخ (الأحدث أولاً)
    const sortByDate = (a: Post, b: Post) => 
      new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime()
    
    return {
      regularPosts: regular.sort(sortByDate),
      reelsPosts: reels.sort(sortByDate)
    }
  }, [posts])

  const displayPosts = activeTab === "posts" ? regularPosts : reelsPosts

  // الحصول على صورة المنشور
  const getPostImage = (post: Post): string => {
    // أولاً: البحث عن صورة في الأصول
    const imageAsset = post.assets?.find(a => a.type === "image")
    if (imageAsset?.url) return imageAsset.url
    
    // ثانياً: البحث عن غلاف فيديو
    const videoAsset = post.assets?.find(a => a.type === "video")
    if (videoAsset?.url && post.post_type === "video" || post.post_type === "reel") {
      // يمكن استخدام thumbnail من الفيديو لاحقاً
    }
    
    // ثالثاً: صورة افتراضية
    return DEFAULT_PLACEHOLDER
  }

  // الحصول على جميع صور الكاروسيل
  const getCarouselImages = (post: Post): string[] => {
    const images = post.assets?.filter(a => a.type === "image").map(a => a.url) || []
    if (images.length === 0) return [DEFAULT_PLACEHOLDER]
    return images
  }

  // الحصول على فيديو المنشور
  const getPostVideo = (post: Post): string | null => {
    const videoAsset = post.assets?.find(a => a.type === "video")
    return videoAsset?.url || null
  }

  // حالة الاعتماد
  const getApprovalBadge = (status: PostStatus) => {
    if (status === "approved") {
      return <Badge className="bg-green-500 text-white text-xs"><CheckCircle2 className="size-3 ml-1" />معتمد</Badge>
    }
    if (status === "rejected") {
      return <Badge className="bg-red-500 text-white text-xs"><XCircle className="size-3 ml-1" />مرفوض</Badge>
    }
    if (status === "client_review") {
      return <Badge className="bg-orange-500 text-white text-xs"><Clock3 className="size-3 ml-1" />بانتظار</Badge>
    }
    return null
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-zinc-950 border rounded-xl overflow-hidden shadow-lg">
      {/* Instagram Profile Header */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-8">
          {/* Profile Picture */}
          <div className="relative">
            {client?.icon_url || client?.logo_url ? (
              <img
                src={client.icon_url || client.logo_url || ""}
                alt={client.name}
                className="w-28 h-28 rounded-full object-cover border-4 border-gray-200"
              />
            ) : (
              <div 
                className="w-28 h-28 rounded-full flex items-center justify-center text-white text-4xl font-bold"
                style={{ backgroundColor: client?.brand_primary_color || "#3b82f6" }}
              >
                {client?.name?.charAt(0) || "?"}
              </div>
            )}
          </div>
          
          {/* Stats */}
          <div className="flex-1">
            <h2 className="font-bold text-2xl mb-4">{client?.name || "العميل"}</h2>
            <div className="flex gap-10 text-base">
              <div className="text-center">
                <span className="font-bold text-xl">{posts.length}</span>
                <p className="text-muted-foreground">منشور</p>
              </div>
              <div className="text-center">
                <span className="font-bold text-xl">-</span>
                <p className="text-muted-foreground">متابع</p>
              </div>
              <div className="text-center">
                <span className="font-bold text-xl">-</span>
                <p className="text-muted-foreground">متابَع</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("posts")}
          className={cn(
            "flex-1 py-4 flex items-center justify-center gap-2 text-base border-b-2 transition-colors",
            activeTab === "posts" 
              ? "border-black dark:border-white text-foreground" 
              : "border-transparent text-muted-foreground"
          )}
        >
          <Grid3X3 className="size-5" />
          <span>المنشورات</span>
          <Badge variant="secondary">{regularPosts.length}</Badge>
        </button>
        <button
          onClick={() => setActiveTab("reels")}
          className={cn(
            "flex-1 py-4 flex items-center justify-center gap-2 text-base border-b-2 transition-colors",
            activeTab === "reels" 
              ? "border-black dark:border-white text-foreground" 
              : "border-transparent text-muted-foreground"
          )}
        >
          <Film className="size-5" />
          <span>ريلز</span>
          <Badge variant="secondary">{reelsPosts.length}</Badge>
        </button>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 dark:bg-zinc-800">
        {displayPosts.length === 0 ? (
          <div className="col-span-3 py-16 text-center text-muted-foreground">
            <ImageIcon className="size-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد منشورات</p>
          </div>
        ) : (
          displayPosts.map((post) => (
            <PostThumbnail
              key={post.id}
              post={post}
              image={getPostImage(post)}
              onClick={() => {
                setSelectedPost(post)
                setCarouselIndex(0)
              }}
              showApprovalBadge={showApprovalBadges}
            />
          ))
        )}
      </div>

      {/* Post Detail Modal */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {selectedPost && (
            <PostDetailView
              post={selectedPost}
              client={client}
              images={getCarouselImages(selectedPost)}
              video={getPostVideo(selectedPost)}
              carouselIndex={carouselIndex}
              setCarouselIndex={setCarouselIndex}
              onClose={() => setSelectedPost(null)}
              showApprovalBadge={showApprovalBadges}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// مكون الصورة المصغرة
interface PostThumbnailProps {
  post: Post
  image: string
  onClick: () => void
  showApprovalBadge?: boolean
}

function PostThumbnail({ post, image, onClick, showApprovalBadge }: PostThumbnailProps) {
  const isVideo = post.post_type === "video" || post.post_type === "reel"
  const isCarousel = post.post_type === "carousel"
  const TypeIcon = POST_TYPE_ICONS[post.post_type]

  return (
    <div 
      className="aspect-square relative cursor-pointer group overflow-hidden bg-gray-200 dark:bg-zinc-700"
      onClick={onClick}
    >
      <img
        src={image}
        alt={post.title}
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
        onError={(e) => {
          (e.target as HTMLImageElement).src = DEFAULT_PLACEHOLDER
        }}
      />
      
      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="text-white text-center">
          <p className="font-medium text-sm line-clamp-2 px-2">{post.title}</p>
        </div>
      </div>

      {/* Type indicator */}
      {(isVideo || isCarousel) && (
        <div className="absolute top-2 left-2">
          {isVideo ? (
            <Play className="size-5 text-white drop-shadow-lg fill-white" />
          ) : (
            <Layers className="size-5 text-white drop-shadow-lg" />
          )}
        </div>
      )}

      {/* Approval badge */}
      {showApprovalBadge && (
        <div className="absolute bottom-2 right-2">
          {post.status === "approved" && (
            <CheckCircle2 className="size-5 text-green-500 drop-shadow-lg" />
          )}
          {post.status === "rejected" && (
            <XCircle className="size-5 text-red-500 drop-shadow-lg" />
          )}
          {post.status === "client_review" && (
            <Clock3 className="size-5 text-orange-500 drop-shadow-lg" />
          )}
        </div>
      )}
    </div>
  )
}

// مكون تفاصيل المنشور
interface PostDetailViewProps {
  post: Post
  client: Client | null
  images: string[]
  video: string | null
  carouselIndex: number
  setCarouselIndex: (index: number) => void
  onClose: () => void
  showApprovalBadge?: boolean
}

function PostDetailView({ 
  post, 
  client, 
  images, 
  video,
  carouselIndex, 
  setCarouselIndex,
  onClose,
  showApprovalBadge
}: PostDetailViewProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const isVideo = post.post_type === "video" || post.post_type === "reel"
  const isCarousel = post.post_type === "carousel" && images.length > 1
  const publishDate = parseLocalDate(post.publish_date)

  return (
    <div className="bg-white dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-3">
          {client?.icon_url || client?.logo_url ? (
            <img
              src={client.icon_url || client.logo_url || ""}
              alt={client.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: client?.brand_primary_color || "#3b82f6" }}
            >
              {client?.name?.charAt(0) || "?"}
            </div>
          )}
          <div>
            <p className="font-semibold text-sm">{client?.name}</p>
            <p className="text-xs text-muted-foreground">
              {publishDate ? format(publishDate, "d MMMM yyyy", { locale: ar }) : ""}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="size-5" />
        </Button>
      </div>

      {/* Media */}
      <div className="relative aspect-square bg-black">
        {isVideo && video ? (
          <div className="w-full h-full flex items-center justify-center">
            {!isPlaying ? (
              <>
                <img
                  src={images[0]}
                  alt={post.title}
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={() => setIsPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/30"
                >
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="size-8 text-black fill-black mr-[-2px]" />
                  </div>
                </button>
              </>
            ) : (
              <video
                src={video}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            )}
          </div>
        ) : (
          <>
            <img
              src={images[carouselIndex] || images[0]}
              alt={post.title}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_PLACEHOLDER
              }}
            />
            
            {/* Carousel Navigation */}
            {isCarousel && (
              <>
                {carouselIndex > 0 && (
                  <button
                    onClick={() => setCarouselIndex(carouselIndex - 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                )}
                {carouselIndex < images.length - 1 && (
                  <button
                    onClick={() => setCarouselIndex(carouselIndex + 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                )}
                
                {/* Dots indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors",
                        idx === carouselIndex ? "bg-blue-500" : "bg-white/60"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Type badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-black/60 text-white border-0">
            {POST_TYPE_ICONS[post.post_type] && (
              <span className="flex items-center gap-1">
                {post.post_type === "post" && "صورة"}
                {post.post_type === "reel" && "ريلز"}
                {post.post_type === "video" && "فيديو"}
                {post.post_type === "story" && "ستوري"}
                {post.post_type === "carousel" && `كاروسيل (${images.length})`}
              </span>
            )}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 border-t">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <Heart className="size-6 cursor-pointer hover:text-red-500 transition-colors" />
            <MessageCircle className="size-6 cursor-pointer hover:text-blue-500 transition-colors" />
            <Send className="size-6 cursor-pointer hover:text-green-500 transition-colors" />
          </div>
          <Bookmark className="size-6 cursor-pointer hover:text-yellow-500 transition-colors" />
        </div>

        {/* Approval Status */}
        {showApprovalBadge && (
          <div className="mb-3">
            {post.status === "approved" && (
              <Badge className="bg-green-500 text-white"><CheckCircle2 className="size-3 ml-1" />معتمد</Badge>
            )}
            {post.status === "rejected" && (
              <Badge className="bg-red-500 text-white"><XCircle className="size-3 ml-1" />مرفوض</Badge>
            )}
            {post.status === "client_review" && (
              <Badge className="bg-orange-500 text-white"><Clock3 className="size-3 ml-1" />بانتظار الاعتماد</Badge>
            )}
          </div>
        )}

        {/* Caption */}
        <div className="space-y-1">
          <p className="text-sm">
            <span className="font-semibold ml-1">{client?.name}</span>
            {post.title}
          </p>
          {post.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {post.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
