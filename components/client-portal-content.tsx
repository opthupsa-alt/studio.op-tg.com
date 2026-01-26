"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { parseLocalDate } from "@/lib/date-utils"
import { format } from "date-fns"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { approvePost, rejectPost, addComment } from "@/lib/actions"
import type { Post, Platform, Client, Comment } from "@/lib/types"
import { STATUS_LABELS, STATUS_COLORS, POST_TYPE_LABELS } from "@/lib/types"

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

export function ClientPortalContent({
  client,
  posts,
  platforms,
  currentYear,
  currentMonth,
}: ClientPortalContentProps) {
  const router = useRouter()
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null)
  const [feedback, setFeedback] = useState("")
  const [newComment, setNewComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter posts for current month
  const currentMonthPosts = posts.filter((post) => {
    const postDate = parseLocalDate(post.publish_date)
    return postDate.getFullYear() === currentYear && postDate.getMonth() + 1 === currentMonth
  })

  // Group posts by status
  const pendingReview = currentMonthPosts.filter((p) => p.status === "client_review")
  const approved = currentMonthPosts.filter((p) => p.status === "approved" || p.status === "scheduled" || p.status === "posted")
  const inProgress = currentMonthPosts.filter((p) => !["client_review", "approved", "scheduled", "posted", "rejected"].includes(p.status))

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

  const PostCard = ({ post }: { post: Post }) => {
    const isReviewable = post.status === "client_review"
    
    return (
      <Card 
        className={cn(
          "cursor-pointer hover:shadow-md transition-shadow",
          isReviewable && "border-orange-300 dark:border-orange-700"
        )}
        onClick={() => handlePostClick(post)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base line-clamp-2">{post.title}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={STATUS_COLORS[post.status]}>
                  {STATUS_LABELS[post.status]}
                </Badge>
                {post.post_type && (
                  <Badge variant="outline" className="text-xs">
                    {POST_TYPE_LABELS[post.post_type]}
                  </Badge>
                )}
              </div>
            </div>
            {isReviewable && (
              <Badge className="bg-orange-500 text-white">
                بانتظار موافقتك
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="size-4" />
              {format(parseLocalDate(post.publish_date), "d MMMM", { locale: ar })}
            </div>
            <div className="flex items-center gap-1">
              {post.platforms?.slice(0, 3).map((platform) => (
                <PlatformIcon key={platform.id} platform={platform.key} size="xs" />
              ))}
              {(post.platforms?.length || 0) > 3 && (
                <span className="text-xs">+{(post.platforms?.length || 0) - 3}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: client.brand_primary_color || "#3B82F6" }}
            >
              {client.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold">{client.name}</h1>
              <p className="text-sm text-muted-foreground">
                خطة المحتوى - {monthNames[currentMonth - 1]} {currentYear}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {currentMonthPosts.length} منشور
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Pending Review Section */}
        {pendingReview.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="size-5 text-orange-500" />
              <h2 className="text-lg font-semibold">بانتظار موافقتك ({pendingReview.length})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingReview.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        {/* Approved Section */}
        {approved.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="size-5 text-green-500" />
              <h2 className="text-lg font-semibold">تمت الموافقة ({approved.length})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approved.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        {/* In Progress Section */}
        {inProgress.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="size-5 text-blue-500" />
              <h2 className="text-lg font-semibold">قيد التحضير ({inProgress.length})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inProgress.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {currentMonthPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Calendar className="size-16 mb-4 opacity-50" />
            <p className="text-lg">لا توجد منشورات لهذا الشهر</p>
            <p className="text-sm">سيتم إضافة المنشورات قريباً</p>
          </div>
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
