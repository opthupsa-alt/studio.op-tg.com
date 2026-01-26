"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { parseLocalDate } from "@/lib/date-utils"
import { format, addMonths, subMonths } from "date-fns"
import { ar } from "date-fns/locale"
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Calendar,
  Clock,
  Send,
  ChevronRight,
  ChevronLeft,
  Home,
  FileText,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Eye,
  Image as ImageIcon,
  Play,
  Layers,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  CheckCheck,
  X,
  Moon,
  Sun,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { PlatformIcon } from "@/components/platform-icon"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { InstagramMockup } from "@/components/instagram-mockup"
import { Grid3X3, LayoutGrid, Instagram } from "lucide-react"
import { approvePost, rejectPost, addComment } from "@/lib/actions"
import type { Post, Platform, Client, Comment, PostType } from "@/lib/types"
import { STATUS_LABELS, STATUS_COLORS, POST_TYPE_LABELS } from "@/lib/types"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"

interface ClientPortalContentProps {
  client: Client
  posts: Post[]
  platforms: Platform[]
  currentYear: number
  currentMonth: number
}

const monthNames = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
]

const POST_TYPE_ICONS: Record<PostType, typeof ImageIcon> = {
  post: ImageIcon,
  reel: Play,
  video: Play,
  story: Eye,
  carousel: Layers,
}

const DEFAULT_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='48'%3E📷%3C/text%3E%3C/svg%3E"

export function ClientPortalContent({
  client,
  posts,
  platforms,
  currentYear,
  currentMonth,
}: ClientPortalContentProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null)
  const [feedback, setFeedback] = useState("")
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [viewMode, setViewMode] = useState<"tabs" | "grid" | "instagram">("tabs")
  
  // Debug: Log posts on mount
  console.log("Client Portal - Total posts received:", posts.length)
  console.log("Client Portal - Posts:", posts.map(p => ({ id: p.id, title: p.title, status: p.status, date: p.publish_date })))
  
  // Find the first month that has posts, prioritizing pending reviews
  const getInitialMonth = () => {
    if (posts.length === 0) {
      return new Date(currentYear, currentMonth - 1)
    }
    
    // First check if there are pending posts
    const pendingPost = posts.find(p => p.status === "client_review")
    if (pendingPost) {
      const date = parseLocalDate(pendingPost.publish_date)
      return new Date(date.getFullYear(), date.getMonth())
    }
    
    // Otherwise use the first post's month
    const firstPost = posts[0]
    const date = parseLocalDate(firstPost.publish_date)
    return new Date(date.getFullYear(), date.getMonth())
  }
  
  const [currentDate, setCurrentDate] = useState(getInitialMonth)

  // Get available months that have posts
  const availableMonths = useMemo(() => {
    const monthsSet = new Map<string, { year: number; month: number; count: number; pending: number }>()
    
    posts.forEach((post) => {
      const postDate = parseLocalDate(post.publish_date)
      const key = `${postDate.getFullYear()}-${postDate.getMonth()}`
      const existing = monthsSet.get(key)
      
      if (existing) {
        existing.count++
        if (post.status === "client_review") existing.pending++
      } else {
        monthsSet.set(key, {
          year: postDate.getFullYear(),
          month: postDate.getMonth(),
          count: 1,
          pending: post.status === "client_review" ? 1 : 0
        })
      }
    })
    
    // Sort by date (newest first)
    return Array.from(monthsSet.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })
  }, [posts])

  // Filter posts for selected month
  const currentMonthPosts = useMemo(() => {
    return posts.filter((post) => {
      const postDate = parseLocalDate(post.publish_date)
      return postDate.getFullYear() === currentDate.getFullYear() && 
             postDate.getMonth() === currentDate.getMonth()
    })
  }, [posts, currentDate])

  // Group posts by status
  const pendingReview = currentMonthPosts.filter((p) => p.status === "client_review")
  const approved = currentMonthPosts.filter((p) => p.status === "approved" || p.status === "scheduled" || p.status === "posted")
  const rejected = currentMonthPosts.filter((p) => p.status === "rejected")
  const inProgress = currentMonthPosts.filter((p) => !["client_review", "approved", "scheduled", "posted", "rejected"].includes(p.status))

  // Stats
  const stats = useMemo(() => ({
    total: currentMonthPosts.length,
    pending: pendingReview.length,
    approved: approved.length,
    rejected: rejected.length,
    inProgress: inProgress.length,
    approvalRate: currentMonthPosts.length > 0 
      ? Math.round((approved.length / (approved.length + rejected.length || 1)) * 100) 
      : 0
  }), [currentMonthPosts, pendingReview, approved, rejected, inProgress])

  // Navigate to specific month
  const handleMonthSelect = (year: number, month: number) => {
    setCurrentDate(new Date(year, month))
  }

  // Get post image
  const getPostImage = (post: Post): string => {
    if ((post as any).cover_url) return (post as any).cover_url
    const imageAsset = post.assets?.find(a => a.type === "image")
    if (imageAsset?.url) return imageAsset.url
    return DEFAULT_PLACEHOLDER
  }

  // Navigate months
  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1))
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1))

  // Logout
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const handlePostClick = (post: Post) => {
    setSelectedPost(post)
  }

  const handleApprove = () => {
    setReviewAction("approve")
    setIsReviewDialogOpen(true)
  }

  const handleReject = () => {
    setReviewAction("reject")
    setIsReviewDialogOpen(true)
  }

  const handleSubmitReview = async () => {
    if (!selectedPost) return
    
    setIsSubmitting(true)
    try {
      if (reviewAction === "approve") {
        await approvePost(selectedPost.id, feedback)
      } else {
        await rejectPost(selectedPost.id, feedback)
      }
      setIsReviewDialogOpen(false)
      setFeedback("")
      setSelectedPost(null)
      // Refresh the page to get updated data
      router.refresh()
    } catch (error) {
      console.error("Error submitting review:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddComment = async () => {
    if (!selectedPost || !newComment.trim()) return
    
    setIsSubmitting(true)
    try {
      await addComment(selectedPost.id, newComment, "client")
      setNewComment("")
      // Refresh the page to get updated data
      router.refresh()
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Enhanced Post Card with Image
  const PostCard = ({ post, showActions = false }: { post: Post; showActions?: boolean }) => {
    const isReviewable = post.status === "client_review"
    const TypeIcon = post.post_type ? POST_TYPE_ICONS[post.post_type] : ImageIcon
    
    return (
      <Card 
        className={cn(
          "group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden",
          isReviewable && "ring-2 ring-orange-400 dark:ring-orange-600"
        )}
        onClick={() => handlePostClick(post)}
      >
        {/* Image */}
        <div className="relative aspect-square bg-muted overflow-hidden">
          <img 
            src={getPostImage(post)} 
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Overlay with type icon */}
          <div className="absolute top-2 right-2">
            <div className="bg-black/60 rounded-full p-1.5">
              <TypeIcon className="size-4 text-white" />
            </div>
          </div>
          {/* Status badge */}
          <div className="absolute top-2 left-2">
            <Badge className={cn(STATUS_COLORS[post.status], "shadow-lg")}>
              {STATUS_LABELS[post.status]}
            </Badge>
          </div>
          {/* Review overlay */}
          {isReviewable && (
            <div className="absolute inset-0 bg-gradient-to-t from-orange-500/80 to-transparent flex items-end justify-center pb-4">
              <Badge className="bg-white text-orange-600 shadow-lg text-sm px-3 py-1">
                ⏳ بانتظار موافقتك
              </Badge>
            </div>
          )}
        </div>
        {/* Content */}
        <CardContent className="p-4">
          <h3 className="font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {format(parseLocalDate(post.publish_date), "d MMM", { locale: ar })}
            </div>
            <div className="flex items-center gap-1">
              {post.platforms?.slice(0, 3).map((platform) => (
                <PlatformIcon key={platform.id} platform={platform.key} size="xs" />
              ))}
              {(post.platforms?.length || 0) > 3 && (
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  +{(post.platforms?.length || 0) - 3}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Stats Card Component
  const StatCard = ({ icon: Icon, label, value, color, onClick }: { 
    icon: any; label: string; value: number; color: string; onClick?: () => void 
  }) => (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-md transition-all",
        onClick && "hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn("p-3 rounded-xl", color)}>
          <Icon className="size-6 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-background border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Client Avatar - Mobile */}
              <div className="md:hidden">
                {client.icon_url || client.logo_url ? (
                  <img
                    src={client.icon_url || client.logo_url || ""}
                    alt={client.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: client.brand_primary_color || "#3B82F6" }}
                  >
                    {client.name.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold">{client.name}</h1>
                <p className="text-sm text-muted-foreground">خطة المحتوى الشهرية</p>
              </div>
            </div>
            
            {/* View Mode & Month Navigation */}
            <div className="flex items-center gap-4">
              {/* View Mode Switcher */}
              <div className="hidden sm:flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === "tabs" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("tabs")}
                  className="gap-1.5"
                >
                  <LayoutGrid className="size-4" />
                  <span className="hidden md:inline">تبويبات</span>
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="gap-1.5"
                >
                  <Grid3X3 className="size-4" />
                  <span className="hidden md:inline">شبكي</span>
                </Button>
                <Button
                  variant={viewMode === "instagram" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("instagram")}
                  className="gap-1.5"
                >
                  <Instagram className="size-4" />
                  <span className="hidden md:inline">انستجرام</span>
                </Button>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                  <ChevronRight className="size-4" />
                </Button>
                <div className="px-4 py-2 bg-muted rounded-lg min-w-[140px] text-center">
                  <span className="font-semibold text-sm">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </span>
                </div>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronLeft className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard 
              icon={FileText} 
              label="إجمالي المنشورات" 
              value={stats.total} 
              color="bg-blue-500"
            />
            <StatCard 
              icon={Clock} 
              label="بانتظار الموافقة" 
              value={stats.pending} 
              color="bg-orange-500"
              onClick={() => setActiveTab("pending")}
            />
            <StatCard 
              icon={CheckCircle2} 
              label="تمت الموافقة" 
              value={stats.approved} 
              color="bg-green-500"
              onClick={() => setActiveTab("approved")}
            />
            <StatCard 
              icon={AlertCircle} 
              label="قيد التحضير" 
              value={stats.inProgress} 
              color="bg-purple-500"
              onClick={() => setActiveTab("progress")}
            />
          </div>

          {/* Approval Progress */}
          {(stats.approved + stats.rejected) > 0 && (
            <Card className="mb-8">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">نسبة الاعتماد</span>
                  <span className="text-sm text-muted-foreground">{stats.approvalRate}%</span>
                </div>
                <Progress value={stats.approvalRate} className="h-2" />
              </CardContent>
            </Card>
          )}

          {/* View Mode: Tabs */}
          {viewMode === "tabs" && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5 h-12">
                <TabsTrigger value="all" className="gap-2">
                  <FileText className="size-4" />
                  <span className="hidden sm:inline">الكل</span>
                  <Badge variant="secondary" className="mr-1">{stats.total}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="size-4" />
                  <span className="hidden sm:inline">بانتظار الموافقة</span>
                  {stats.pending > 0 && (
                    <Badge className="bg-orange-500 text-white mr-1">{stats.pending}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2">
                  <CheckCircle2 className="size-4" />
                  <span className="hidden sm:inline">معتمد</span>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  <XCircle className="size-4" />
                  <span className="hidden sm:inline">مرفوض</span>
                </TabsTrigger>
                <TabsTrigger value="progress" className="gap-2">
                  <BarChart3 className="size-4" />
                  <span className="hidden sm:inline">قيد التحضير</span>
                </TabsTrigger>
              </TabsList>

              {/* All Posts Tab */}
              <TabsContent value="all">
                {currentMonthPosts.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {currentMonthPosts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <Calendar className="size-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">لا توجد منشورات لهذا الشهر</h3>
                    <p className="text-muted-foreground">اختر شهراً آخر من القائمة الجانبية</p>
                  </Card>
                )}
              </TabsContent>

              {/* Pending Review Tab */}
              <TabsContent value="pending">
                {pendingReview.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {pendingReview.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <CheckCheck className="size-16 mx-auto mb-4 text-green-500 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">لا توجد منشورات بانتظار موافقتك</h3>
                    <p className="text-muted-foreground">عمل رائع! جميع المنشورات تمت مراجعتها</p>
                  </Card>
                )}
              </TabsContent>

              {/* Approved Tab */}
              <TabsContent value="approved">
                {approved.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {approved.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <FileText className="size-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">لا توجد منشورات معتمدة</h3>
                    <p className="text-muted-foreground">المنشورات المعتمدة ستظهر هنا</p>
                  </Card>
                )}
              </TabsContent>

              {/* Rejected Tab */}
              <TabsContent value="rejected">
                {rejected.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {rejected.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center">
                    <ThumbsUp className="size-16 mx-auto mb-4 text-green-500 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">لا توجد منشورات مرفوضة</h3>
                    <p className="text-muted-foreground">ممتاز! لم يتم رفض أي منشور</p>
                  </Card>
              )}
            </TabsContent>

            {/* In Progress Tab */}
            <TabsContent value="progress">
              {inProgress.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {inProgress.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <Calendar className="size-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد منشورات قيد التحضير</h3>
                  <p className="text-muted-foreground">المنشورات قيد الإعداد ستظهر هنا</p>
                </Card>
              )}
            </TabsContent>
            </Tabs>
          )}

          {/* View Mode: Grid */}
          {viewMode === "grid" && (
            <div className="space-y-6">
              {currentMonthPosts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {currentMonthPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <Grid3X3 className="size-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد منشورات لهذا الشهر</h3>
                  <p className="text-muted-foreground">جرب التنقل لشهر آخر</p>
                </Card>
              )}
            </div>
          )}

          {/* View Mode: Instagram Mockup */}
          {viewMode === "instagram" && (
            <div className="flex justify-center py-4">
              <InstagramMockup
                posts={currentMonthPosts}
                client={client}
                showApprovalBadges={true}
              />
            </div>
          )}

          {/* Empty State for whole month - only show in tabs mode */}
          {viewMode === "tabs" && currentMonthPosts.length === 0 && (
            <Card className="p-16 text-center mt-8">
              <Calendar className="size-20 mx-auto mb-6 text-primary opacity-30" />
              <h3 className="text-2xl font-bold mb-3">لا توجد منشورات لهذا الشهر</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                سيتم إضافة المنشورات قريباً من قبل فريق التسويق. 
                يمكنك التنقل بين الأشهر لعرض المنشورات السابقة أو القادمة.
              </p>
            </Card>
          )}
        </main>

      {/* Post Detail Side Panel */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-y-0 left-0 w-full max-w-lg bg-background border-r shadow-lg">
            <div className="flex flex-col h-full">
              {/* Panel Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">تفاصيل المنشور</h2>
                <Button variant="ghost" size="icon" onClick={() => setSelectedPost(null)}>
                  <ChevronRight className="size-5" />
                </Button>
              </div>

              {/* Panel Content */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                  {/* Title & Status */}
                  <div>
                    <h3 className="text-xl font-bold mb-2">{selectedPost.title}</h3>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_COLORS[selectedPost.status]}>
                        {STATUS_LABELS[selectedPost.status]}
                      </Badge>
                      {selectedPost.post_type && (
                        <Badge variant="outline">
                          {POST_TYPE_LABELS[selectedPost.post_type]}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Date & Platforms */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="size-4 text-muted-foreground" />
                      <span>تاريخ النشر: {format(parseLocalDate(selectedPost.publish_date), "EEEE, d MMMM yyyy", { locale: ar })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">المنصات:</span>
                      <div className="flex items-center gap-1">
                        {selectedPost.platforms?.map((platform) => (
                          <PlatformIcon key={platform.id} platform={platform.key} size="sm" />
                        ))}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Description */}
                  {selectedPost.description && (
                    <>
                      <div>
                        <h4 className="font-medium mb-2">الوصف</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {selectedPost.description}
                        </p>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Comments */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <MessageSquare className="size-4" />
                      التعليقات
                    </h4>
                    <div className="space-y-3 mb-4">
                      {selectedPost.comments?.filter((c: Comment) => c.scope === "client").length === 0 ? (
                        <p className="text-sm text-muted-foreground">لا توجد تعليقات</p>
                      ) : (
                        selectedPost.comments?.filter((c: Comment) => c.scope === "client").map((comment: Comment) => (
                          <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                            <Avatar className="size-8">
                              <AvatarFallback className="text-xs">
                                {comment.user?.full_name?.charAt(0) || "م"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {comment.user?.full_name || "مستخدم"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(comment.created_at), "d MMM", { locale: ar })}
                                </span>
                              </div>
                              <p className="text-sm">{comment.comment}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment */}
                    <div className="space-y-2">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="أضف تعليقك هنا..."
                        rows={3}
                      />
                      <Button 
                        className="w-full" 
                        disabled={!newComment.trim() || isSubmitting}
                        onClick={handleAddComment}
                      >
                        <Send className="size-4 ml-2" />
                        إرسال التعليق
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Panel Footer - Review Actions */}
              {selectedPost.status === "client_review" && (
                <div className="p-4 border-t space-y-2">
                  <p className="text-sm text-muted-foreground text-center mb-3">
                    هل توافق على هذا المنشور؟
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={handleApprove}
                    >
                      <CheckCircle2 className="size-4 ml-2" />
                      موافقة
                    </Button>
                    <Button 
                      variant="destructive"
                      className="flex-1"
                      onClick={handleReject}
                    >
                      <XCircle className="size-4 ml-2" />
                      رفض
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "تأكيد الموافقة" : "تأكيد الرفض"}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approve" 
                ? "هل أنت متأكد من الموافقة على هذا المنشور؟ سيتم قفله ولن يمكن تعديله."
                : "يرجى إدخال سبب الرفض ليتمكن الفريق من إجراء التعديلات المطلوبة."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={reviewAction === "approve" ? "ملاحظات إضافية (اختياري)..." : "سبب الرفض..."}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleSubmitReview}
              disabled={isSubmitting || (reviewAction === "reject" && !feedback.trim())}
              className={reviewAction === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
              variant={reviewAction === "reject" ? "destructive" : "default"}
            >
              {isSubmitting ? "جاري الإرسال..." : reviewAction === "approve" ? "تأكيد الموافقة" : "تأكيد الرفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
