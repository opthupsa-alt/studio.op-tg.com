"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import {
  X,
  Save,
  Trash2,
  Clock,
  CalendarIcon,
  Send,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ImageIcon,
  Video,
  Images,
  FileText,
  Sparkles,
  Plus,
  Copy,
  ExternalLink,
  Film,
  Camera,
  Layers,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { PlatformIcon } from "@/components/platform-icon"
import { addComment, createPostVariant, updatePostVariant, uploadAsset, deleteAsset } from "@/lib/actions"
import type { Post, Platform, PostStatus, Comment, PostVariant } from "@/lib/types"

type PostSidePanelProps = {
  post: Post | null
  isOpen: boolean
  onClose: () => void
  onSave: (post: Partial<Post>) => void
  onDelete: (id: string) => void
  onSubmitForReview: (id: string) => void
  platforms: Platform[]
  isNew?: boolean
  defaultDate?: Date
}

const goalOptions = [
  { value: "awareness", label: "الوعي" },
  { value: "engagement", label: "التفاعل" },
  { value: "leads", label: "عملاء محتملين" },
  { value: "messages", label: "رسائل" },
  { value: "sales", label: "مبيعات" },
]

const statusOptions: { value: PostStatus; label: string }[] = [
  { value: "idea", label: "فكرة" },
  { value: "draft", label: "مسودة" },
  { value: "design", label: "تصميم" },
  { value: "internal_review", label: "مراجعة داخلية" },
  { value: "client_review", label: "مراجعة العميل" },
  { value: "approved", label: "معتمد" },
  { value: "scheduled", label: "مجدول" },
  { value: "posted", label: "منشور" },
]

const postTypeOptions = [
  { value: "carousel", label: "كاروسيل", icon: Layers },
  { value: "story", label: "ستوري", icon: Camera },
  { value: "video", label: "فيديو", icon: Video },
  { value: "reel", label: "ريلز", icon: Film },
  { value: "post", label: "صورة", icon: ImageIcon },
]

export function PostSidePanel({
  post,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onSubmitForReview,
  platforms,
  isNew = false,
  defaultDate,
}: PostSidePanelProps) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [mainGoal, setMainGoal] = useState("")
  const [mainContent, setMainContent] = useState("")
  const [postType, setPostType] = useState("post")
  const [status, setStatus] = useState<PostStatus>("idea")
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>()
  const [scheduledTime, setScheduledTime] = useState("")
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [variants, setVariants] = useState<Partial<PostVariant>[]>([])
  const [newComment, setNewComment] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("content")
  const publishDate = scheduledDate; // Declare publishDate variable

  useEffect(() => {
    if (post) {
      setTitle(post.title || "")
      setMainContent(post.description || "")
      setMainGoal(post.main_goal || "")
      setPostType(post.post_type || "post")
      setStatus(post.status)
      setScheduledDate(post.publish_date ? new Date(post.publish_date) : undefined)
      setScheduledTime("")
      setSelectedPlatforms(post.platforms?.map((p) => p.id) || [])
      setVariants(post.variants || [])
      setNewComment("")
    } else if (isNew && isOpen) {
      // Reset ALL fields for new post
      setTitle("")
      setMainContent("")
      setMainGoal("")
      setPostType("post")
      setStatus("idea")
      setScheduledDate(defaultDate)
      setScheduledTime("")
      setSelectedPlatforms([])
      setVariants([])
      setNewComment("")
      setActiveTab("content")
    }
  }, [post, defaultDate, isNew, isOpen])

  const handleSave = async () => {
    if (isSaving) return // Prevent double submission
    
    setIsSaving(true)
    try {
      // Save post first
      await onSave({
        id: post?.id,
        title,
        main_goal: mainGoal as Post["main_goal"],
        post_type: postType as Post["post_type"],
        status,
        publish_date: publishDate ? format(publishDate, "yyyy-MM-dd") : undefined,
      })

    // Save variants if post exists and has variants
      if (post?.id && variants.length > 0) {
        for (const variant of variants) {
          if (variant.platform_id && variant.caption) {
            // Check if variant already exists
            const existingVariant = post.variants?.find(
              (v) => v.platform_id === variant.platform_id
            )
            
            if (existingVariant) {
              // Update existing variant
              await updatePostVariant(existingVariant.id, {
                caption: variant.caption || undefined,
                hashtags: variant.hashtags || undefined,
                cta: variant.cta || undefined,
                design_notes: variant.design_notes || undefined,
              })
            } else {
              // Create new variant
              await createPostVariant({
                post_id: post.id,
                platform_id: variant.platform_id,
                caption: variant.caption || undefined,
                hashtags: variant.hashtags || undefined,
                cta: variant.cta || undefined,
                design_notes: variant.design_notes || undefined,
              })
            }
          }
        }
      }
    } catch (error) {
      console.error("Error saving post:", error)
      alert("حدث خطأ أثناء حفظ المنشور")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    )
  }

  const generateVariantContent = () => {
    // Default content for new variants
    return ""
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-xl p-0 flex flex-col"
      >
        <SheetHeader className="p-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-bold">
              {isNew ? "منشور جديد" : "تعديل المنشور"}
            </SheetTitle>
            <div className="flex items-center gap-2">
              {!isNew && onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(post!.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-4 shrink-0 w-auto flex flex-row-reverse">
            <TabsTrigger value="content" className="flex-1">المحتوى</TabsTrigger>
            <TabsTrigger value="platforms" className="flex-1">المنصات</TabsTrigger>
            <TabsTrigger value="schedule" className="flex-1">الجدولة</TabsTrigger>
            <TabsTrigger value="comments" className="flex-1">التعليقات</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4">
              <TabsContent value="content" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">عنوان المنشور</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="أدخل عنوان المنشور..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">المحتوى الرئيسي</Label>
                  <Textarea
                    id="content"
                    value={mainContent}
                    onChange={(e) => setMainContent(e.target.value)}
                    placeholder="اكتب محتوى المنشور هنا..."
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    {mainContent.length} حرف
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>نوع المنشور</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {postTypeOptions.map((type) => {
                      const Icon = type.icon
                      return (
                        <Button
                          key={type.value}
                          variant={postType === type.value ? "default" : "outline"}
                          className="flex flex-col gap-1 h-auto py-3"
                          onClick={() => setPostType(type.value)}
                        >
                          <Icon className="size-5" />
                          <span className="text-xs">{type.label}</span>
                        </Button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>الهدف الرئيسي</Label>
                  <Select value={mainGoal} onValueChange={setMainGoal}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الهدف..." />
                    </SelectTrigger>
                    <SelectContent>
                      {goalOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as PostStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>رفع الملفات</Label>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/*,video/*,.pdf"
                    multiple
                    disabled={isUploadingFile}
                    onChange={async (e) => {
                      const files = e.target.files
                      if (!files) return
                      
                      // If new post, save first then upload
                      if (isNew || !post?.id) {
                        alert("يرجى حفظ المنشور أولاً ثم رفع الملفات")
                        e.target.value = ""
                        return
                      }
                      
                      setIsUploadingFile(true)
                      try {
                        for (const file of Array.from(files)) {
                          const result = await uploadAsset(post.id, file)
                          if (result.error) {
                            console.error("Error uploading file:", result.error)
                            alert(`خطأ في رفع ${file.name}: ${result.error}`)
                          }
                        }
                        // Refresh to show new files
                        router.refresh()
                      } catch (error) {
                        console.error("Error uploading files:", error)
                      } finally {
                        setIsUploadingFile(false)
                        e.target.value = ""
                      }
                    }}
                  />
                  <label
                    htmlFor="file-upload"
                    className={cn(
                      "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer block",
                      isUploadingFile 
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:border-primary hover:bg-accent/50"
                    )}
                  >
                    {isUploadingFile ? (
                      <>
                        <div className="size-8 mx-auto mb-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <p className="text-sm text-muted-foreground">جاري الرفع...</p>
                      </>
                    ) : (
                      <>
                        <Plus className="size-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {isNew ? "احفظ المنشور أولاً ثم ارفع الملفات" : "اسحب الملفات هنا أو انقر للاختيار"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, GIF, MP4 حتى 50MB
                        </p>
                      </>
                    )}
                  </label>
                  
                  {/* Display existing assets */}
                  {post?.assets && post.assets.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <Label className="text-xs text-muted-foreground">الملفات المرفقة</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {post.assets.map((asset: any) => (
                          <div key={asset.id} className="relative group">
                            {asset.type === "image" ? (
                              <img 
                                src={asset.url} 
                                alt={asset.name} 
                                className="w-full h-20 object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-full h-20 bg-muted rounded-lg flex items-center justify-center">
                                <Video className="size-6 text-muted-foreground" />
                              </div>
                            )}
                            <button
                              type="button"
                              className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={async () => {
                                if (!confirm("هل أنت متأكد من حذف هذا الملف؟")) return
                                const result = await deleteAsset(asset.id)
                                if (result.error) {
                                  alert(result.error)
                                } else {
                                  router.refresh()
                                }
                              }}
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="platforms" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label>اختر المنصات</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {platforms.map((platform) => (
                      <div
                        key={platform.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedPlatforms.includes(platform.id)
                            ? "border-primary bg-primary/5"
                            : "hover:border-muted-foreground"
                        )}
                        onClick={() => handlePlatformToggle(platform.id)}
                      >
                        <Checkbox
                          checked={selectedPlatforms.includes(platform.id)}
                          onCheckedChange={() => handlePlatformToggle(platform.id)}
                        />
                        <PlatformIcon platform={platform.key} size="sm" />
                        <span className="text-sm">{platform.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedPlatforms.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>نسخ مخصصة لكل منصة</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newVariants = selectedPlatforms.map((platformId) => {
                              const platform = platforms.find((p) => p.id === platformId)!
                              return {
                                platform_id: platformId,
                                content: generateVariantContent(),
                                platform,
                              }
                            })
                            setVariants(newVariants)
                          }}
                        >
                          <Copy className="size-4 ml-2" />
                          إنشاء نسخ تلقائياً
                        </Button>
                      </div>

                      {selectedPlatforms.map((platformId) => {
                        const platform = platforms.find((p) => p.id === platformId)
                        const variant = variants.find((v) => v.platform_id === platformId)
                        if (!platform) return null

                        return (
                          <div key={platformId} className="space-y-2 p-3 rounded-lg border">
                            <div className="flex items-center gap-2">
                              <PlatformIcon platform={platform.key} size="sm" />
                              <span className="font-medium text-sm">{platform.name}</span>
                            </div>
                            <Textarea
                              value={variant?.caption || ""}
                              onChange={(e) => {
                                setVariants((prev) => {
                                  const existing = prev.findIndex(
                                    (v) => v.platform_id === platformId
                                  )
                                  if (existing >= 0) {
                                    const updated = [...prev]
                                    updated[existing] = {
                                      ...updated[existing],
                                      caption: e.target.value,
                                    }
                                    return updated
                                  }
                                  return [
                                    ...prev,
                                    { platform_id: platformId, caption: e.target.value },
                                  ]
                                })
                              }}
                              placeholder={`محتوى ${platform.name}...`}
                              rows={3}
                            />
                            <p className="text-xs text-muted-foreground">
                              {variant?.caption?.length || 0} حرف
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="schedule" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label>تاريخ النشر</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-between text-right font-normal",
                          !scheduledDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="size-4 shrink-0" />
                        <span className="flex-1 text-right">
                          {scheduledDate
                            ? format(scheduledDate, "PPP", { locale: ar })
                            : "اختر التاريخ"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">وقت النشر</Label>
                  <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                    <Clock className="size-4 text-muted-foreground shrink-0" />
                    <Input
                      id="time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="border-0 p-0 h-auto text-right flex-1 shadow-none focus-visible:ring-0"
                      dir="ltr"
                    />
                  </div>
                </div>

                {scheduledDate && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-end gap-2 text-primary mb-2">
                      <span className="font-medium">ملخص الجدولة</span>
                      <Clock className="size-4" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      سيتم نشر هذا المحتوى في{" "}
                      <span className="font-medium text-foreground">
                        {format(scheduledDate, "EEEE, d MMMM yyyy", { locale: ar })}
                      </span>
                      {scheduledTime && (
                        <>
                          {" "}
                          الساعة{" "}
                          <span className="font-medium text-foreground">{scheduledTime}</span>
                        </>
                      )}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="comments" className="mt-0 space-y-4">
                <div className="space-y-4">
                  {!post?.comments || post.comments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="size-12 mx-auto mb-2 opacity-50" />
                      <p>لا توجد تعليقات بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {post.comments.map((comment: Comment) => (
                        <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
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
                              {comment.scope === "internal" && (
                                <Badge variant="outline" className="text-xs">داخلي</Badge>
                              )}
                            </div>
                            <p className="text-sm">{comment.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="new-comment">إضافة تعليق</Label>
                  <Textarea
                    id="new-comment"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="اكتب تعليقك هنا..."
                    rows={3}
                  />
                  <Button 
                    className="w-full" 
                    disabled={!newComment.trim() || isSubmittingComment || isNew}
                    onClick={async () => {
                      if (!post || !newComment.trim()) return
                      setIsSubmittingComment(true)
                      try {
                        const result = await addComment(post.id, newComment, "internal")
                        if (result.error) {
                          console.error("Error adding comment:", result.error)
                        } else {
                          setNewComment("")
                          // Refresh to get updated comments
                          router.refresh()
                        }
                      } catch (error) {
                        console.error("Error adding comment:", error)
                      } finally {
                        setIsSubmittingComment(false)
                      }
                    }}
                  >
                    <Send className="size-4 ml-2" />
                    {isSubmittingComment ? "جاري الإرسال..." : "إرسال التعليق"}
                  </Button>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>

        <div className="p-4 border-t shrink-0 space-y-2">
          {status === "draft" && onSubmitForReview && !isNew && (
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => onSubmitForReview(post!.id)}
            >
              <Send className="size-4 ml-2" />
              إرسال للمراجعة
            </Button>
          )}
          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="size-4 ml-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {isNew ? "جاري الإنشاء..." : "جاري الحفظ..."}
              </>
            ) : (
              <>
                <Save className="size-4 ml-2" />
                {isNew ? "إنشاء المنشور" : "حفظ التغييرات"}
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
