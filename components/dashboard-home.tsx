"use client"

import { format } from "date-fns"
import { ar } from "date-fns/locale"
import Link from "next/link"
import {
  Calendar,
  FileText,
  Users,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  MessageSquare,
  ArrowRight,
  LayoutGrid,
  Kanban,
  Target,
  Send,
  Eye,
  PenTool,
  Palette,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { TeamMember } from "@/lib/types"

type DashboardStats = {
  totalPosts: number
  thisMonthPosts: number
  upcomingPosts: number
  overduePosts: number
  pendingReview: number
  approvedPosts: number
  postedPosts: number
  rejectedPosts: number
  clientsCount: number
  teamCount: number
  plansCount: number
  statusCounts: {
    idea: number
    draft: number
    design: number
    internal_review: number
    client_review: number
    approved: number
    scheduled: number
    posted: number
    rejected: number
  }
}

type DashboardHomeProps = {
  user: TeamMember
  stats: DashboardStats
  upcomingPosts: any[]
  overduePosts: any[]
  recentComments: any[]
}

const roleLabels: Record<string, string> = {
  admin: "مدير النظام",
  manager: "مشرف",
  writer: "كاتب محتوى",
  designer: "مصمم",
  client: "عميل",
}

const statusLabels: Record<string, string> = {
  idea: "فكرة",
  draft: "مسودة",
  design: "تصميم",
  internal_review: "مراجعة داخلية",
  client_review: "مراجعة العميل",
  approved: "معتمد",
  scheduled: "مجدول",
  posted: "منشور",
  rejected: "مرفوض",
}

const statusColors: Record<string, string> = {
  idea: "bg-gray-500",
  draft: "bg-yellow-500",
  design: "bg-purple-500",
  internal_review: "bg-blue-500",
  client_review: "bg-orange-500",
  approved: "bg-green-500",
  scheduled: "bg-cyan-500",
  posted: "bg-emerald-500",
  rejected: "bg-red-500",
}

export function DashboardHome({
  user,
  stats,
  upcomingPosts,
  overduePosts,
  recentComments,
}: DashboardHomeProps) {
  const isAdmin = user.role === "admin"
  const isManager = user.role === "manager"
  const isWriter = user.role === "writer"
  const isDesigner = user.role === "designer"
  const isAdminOrManager = isAdmin || isManager

  // Calculate completion rate
  const completionRate = stats.totalPosts > 0 
    ? Math.round((stats.postedPosts / stats.totalPosts) * 100) 
    : 0

  // Get greeting based on time
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء الخير"

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="sticky top-0 z-10 flex h-auto min-h-14 shrink-0 items-center gap-2 border-b bg-background px-2 sm:px-4 py-2">
        <SidebarTrigger className="-mr-1" />
        <Separator orientation="vertical" className="ml-2 h-4 hidden sm:block" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-sm sm:text-lg">
                لوحة التحكم
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Welcome Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {greeting}، {user.full_name || "مستخدم"} 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                {roleLabels[user.role]} • {format(new Date(), "EEEE، d MMMM yyyy", { locale: ar })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/calendar">
                  <Calendar className="size-4 ml-2" />
                  التقويم
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/kanban">
                  <Kanban className="size-4 ml-2" />
                  كانبان
                </Link>
              </Button>
            </div>
          </div>

          {/* Quick Stats - Different for each role */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Total Posts - Everyone */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المنشورات</CardTitle>
                <FileText className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPosts}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.thisMonthPosts} هذا الشهر
                </p>
              </CardContent>
            </Card>

            {/* Upcoming Posts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">قادمة (7 أيام)</CardTitle>
                <Clock className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.upcomingPosts}</div>
                <p className="text-xs text-muted-foreground">
                  منشور بحاجة للتجهيز
                </p>
              </CardContent>
            </Card>

            {/* Pending Review - Admin/Manager */}
            {isAdminOrManager && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">بانتظار المراجعة</CardTitle>
                  <Eye className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{stats.pendingReview}</div>
                  <p className="text-xs text-muted-foreground">
                    تحتاج موافقتك
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Writer-specific: Draft count */}
            {isWriter && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">مسودات</CardTitle>
                  <PenTool className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.statusCounts.idea + stats.statusCounts.draft}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    بحاجة للكتابة
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Designer-specific: Design count */}
            {isDesigner && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">للتصميم</CardTitle>
                  <Palette className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.statusCounts.design}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    بحاجة للتصميم
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Overdue - Everyone */}
            <Card className={stats.overduePosts > 0 ? "border-red-200 bg-red-50 dark:bg-red-950/20" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متأخرة</CardTitle>
                <AlertTriangle className={`size-4 ${stats.overduePosts > 0 ? "text-red-500" : "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.overduePosts > 0 ? "text-red-600" : ""}`}>
                  {stats.overduePosts}
                </div>
                <p className="text-xs text-muted-foreground">
                  تجاوزت الموعد
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Admin/Manager Only: Overview Cards */}
          {isAdminOrManager && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">العملاء</CardTitle>
                  <Building2 className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.clientsCount}</div>
                  <Link href="/clients" className="text-xs text-primary hover:underline">
                    إدارة العملاء ←
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">فريق العمل</CardTitle>
                  <Users className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.teamCount}</div>
                  <Link href="/team" className="text-xs text-primary hover:underline">
                    إدارة الفريق ←
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">الخطط النشطة</CardTitle>
                  <Target className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.plansCount}</div>
                  <Link href="/plans/new" className="text-xs text-primary hover:underline">
                    إنشاء خطة جديدة ←
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Distribution */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-5" />
                  توزيع المنشورات حسب الحالة
                </CardTitle>
                <CardDescription>
                  نظرة عامة على حالة جميع المنشورات
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.statusCounts).map(([status, count]) => {
                    const percentage = stats.totalPosts > 0 
                      ? Math.round((count / stats.totalPosts) * 100) 
                      : 0
                    return (
                      <div key={status} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`size-3 rounded-full ${statusColors[status]}`} />
                            <span>{statusLabels[status]}</span>
                          </div>
                          <span className="font-medium">{count} ({percentage}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </div>

                {/* Completion Rate */}
                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">معدل الإنجاز</span>
                    <span className="text-2xl font-bold text-green-600">{completionRate}%</span>
                  </div>
                  <Progress value={completionRate} className="h-3" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="size-5" />
                  آخر النشاطات
                </CardTitle>
                <CardDescription>
                  أحدث التعليقات والتفاعلات
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentComments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا توجد نشاطات حديثة
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentComments.map((comment: any) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">
                            {comment.user?.full_name?.charAt(0) || "م"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {comment.user?.full_name || "مستخدم"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            علق على: {comment.post?.title || "منشور"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(comment.created_at), "d MMM، h:mm a", { locale: ar })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming & Overdue Posts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Posts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="size-5" />
                    المنشورات القادمة
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/calendar">
                      عرض الكل
                      <ArrowRight className="size-4 mr-1" />
                    </Link>
                  </Button>
                </div>
                <CardDescription>
                  المنشورات المجدولة للأيام السبعة القادمة
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingPosts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لا توجد منشورات قادمة
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingPosts.map((post: any) => (
                      <div
                        key={post.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{post.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(post.publish_date), "EEEE، d MMMM", { locale: ar })}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {statusLabels[post.status]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Overdue Posts */}
            <Card className={overduePosts.length > 0 ? "border-red-200" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className={`size-5 ${overduePosts.length > 0 ? "text-red-500" : ""}`} />
                    المنشورات المتأخرة
                  </CardTitle>
                  {overduePosts.length > 0 && (
                    <Badge variant="destructive">{overduePosts.length}</Badge>
                  )}
                </div>
                <CardDescription>
                  منشورات تجاوزت موعد النشر المحدد
                </CardDescription>
              </CardHeader>
              <CardContent>
                {overduePosts.length === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle2 className="size-12 mx-auto text-green-500 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      لا توجد منشورات متأخرة 🎉
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {overduePosts.map((post: any) => (
                      <div
                        key={post.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{post.title}</p>
                          <p className="text-xs text-red-600">
                            كان مجدولاً: {format(new Date(post.publish_date), "d MMMM", { locale: ar })}
                          </p>
                        </div>
                        <Badge variant="destructive" className="shrink-0">
                          {statusLabels[post.status]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>إجراءات سريعة</CardTitle>
              <CardDescription>
                الوصول السريع للمهام الشائعة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                  <Link href="/calendar">
                    <Calendar className="size-6" />
                    <span>التقويم</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                  <Link href="/grid">
                    <LayoutGrid className="size-6" />
                    <span>عرض الشبكة</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                  <Link href="/kanban">
                    <Kanban className="size-6" />
                    <span>كانبان</span>
                  </Link>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                  <Link href="/list">
                    <FileText className="size-6" />
                    <span>القائمة</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
