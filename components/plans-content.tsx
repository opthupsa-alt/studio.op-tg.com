"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  Plus, 
  Calendar, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  FileText,
  ChevronRight,
  Building2,
  Share2,
  Copy,
  Check,
  Lock,
  Globe
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { deletePlan } from "@/lib/actions"
import type { Client, Plan } from "@/lib/types"

interface PlansContentProps {
  clients: Client[]
  plans: Plan[]
}

const monthNames = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
]

export function PlansContent({ clients, plans }: PlansContentProps) {
  const router = useRouter()
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [selectedPlanForShare, setSelectedPlanForShare] = useState<{ plan: Plan; client: Client } | null>(null)
  const [usePassword, setUsePassword] = useState(false)
  const [sharePassword, setSharePassword] = useState("")
  const [copied, setCopied] = useState(false)

  const getShareUrl = () => {
    if (!selectedPlanForShare) return ""
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    let url = `${baseUrl}/share/${selectedPlanForShare.client.id}/${selectedPlanForShare.plan.year}/${selectedPlanForShare.plan.month}`
    if (usePassword && sharePassword) {
      url += `?password=${encodeURIComponent(sharePassword)}`
    }
    return url
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openShareDialog = (plan: Plan, client: Client) => {
    setSelectedPlanForShare({ plan, client })
    setUsePassword(false)
    setSharePassword("")
    setCopied(false)
    setShareDialogOpen(true)
  }

  // Group plans by client
  const plansByClient = clients.map(client => ({
    client,
    plans: plans.filter(plan => plan.client_id === client.id)
      .sort((a, b) => {
        // Sort by year desc, then month desc
        if (a.year !== b.year) return b.year - a.year
        return b.month - a.month
      })
  })).filter(item => item.plans.length > 0 || true) // Show all clients

  const handleDeletePlan = async (planId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الخطة؟")) return
    
    try {
      const result = await deletePlan(planId)
      if (result.error) {
        console.error("Error deleting plan:", result.error)
        alert(result.error)
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error("Error deleting plan:", error)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="sticky top-0 z-10 flex h-auto min-h-14 shrink-0 items-center gap-2 border-b bg-background px-2 sm:px-4 py-2">
        <SidebarTrigger className="-mr-1" />
        <Separator orientation="vertical" className="ml-2 h-4 hidden sm:block" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-sm sm:text-lg">
                الخطط
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex-1" />

        <Link href="/plans/new">
          <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
            <Plus className="size-4 ml-1 sm:ml-2" />
            <span className="hidden sm:inline">خطة جديدة</span>
            <span className="sm:hidden">جديدة</span>
          </Button>
        </Link>
      </header>

      <main className="flex-1 overflow-auto p-3 sm:p-6">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
            <Building2 className="size-12 sm:size-16 mb-4 opacity-50" />
            <p className="text-base sm:text-lg">لا يوجد عملاء</p>
            <p className="text-xs sm:text-sm">ابدأ بإضافة عميل جديد أولاً</p>
            <Link href="/clients" className="mt-4">
              <Button variant="outline">
                إضافة عميل
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {plansByClient.map(({ client, plans: clientPlans }) => (
              <Card key={client.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: client.brand_primary_color || "#3B82F6" }}
                      >
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{client.name}</CardTitle>
                        <CardDescription>
                          {clientPlans.length} خطة
                        </CardDescription>
                      </div>
                    </div>
                    <Link href={`/plans/new?client=${client.id}`}>
                      <Button variant="outline" size="sm">
                        <Plus className="size-4 ml-1" />
                        خطة جديدة
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {clientPlans.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="size-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">لا توجد خطط لهذا العميل</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {clientPlans.map((plan) => (
                        <Card 
                          key={plan.id} 
                          className="hover:shadow-md transition-shadow cursor-pointer group relative"
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem asChild>
                                <Link href={`/calendar?plan=${plan.id}`}>
                                  <Calendar className="ml-2 size-4" />
                                  عرض التقويم
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openShareDialog(plan, client)}>
                                <Share2 className="ml-2 size-4" />
                                مشاركة الخطة
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDeletePlan(plan.id)}
                              >
                                <Trash2 className="ml-2 size-4" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Link href={`/calendar?client=${client.id}&year=${plan.year}&month=${plan.month}`}>
                            <CardHeader className="pb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="size-5 text-primary" />
                                <CardTitle className="text-base">
                                  {monthNames[plan.month - 1]} {plan.year}
                                </CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex items-center justify-between">
                                <Badge variant={plan.status === "active" ? "default" : "secondary"}>
                                  {plan.status === "active" ? "نشطة" : "مؤرشفة"}
                                </Badge>
                                <ChevronRight className="size-4 text-muted-foreground" />
                              </div>
                            </CardContent>
                          </Link>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="size-5" />
              مشاركة الخطة
            </DialogTitle>
            <DialogDescription>
              {selectedPlanForShare && (
                <>
                  شارك خطة {monthNames[selectedPlanForShare.plan.month - 1]} {selectedPlanForShare.plan.year} 
                  لـ {selectedPlanForShare.client.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Password Option */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                {usePassword ? (
                  <Lock className="size-5 text-amber-500" />
                ) : (
                  <Globe className="size-5 text-green-500" />
                )}
                <div>
                  <Label className="font-medium">
                    {usePassword ? "محمية بكلمة مرور" : "عامة"}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {usePassword ? "يحتاج المشاهد لكلمة مرور" : "يمكن لأي شخص لديه الرابط المشاهدة"}
                  </p>
                </div>
              </div>
              <Switch checked={usePassword} onCheckedChange={setUsePassword} />
            </div>

            {/* Password Input */}
            {usePassword && (
              <div className="space-y-2">
                <Label htmlFor="share-password">كلمة المرور</Label>
                <Input
                  id="share-password"
                  type="text"
                  placeholder="أدخل كلمة المرور..."
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                />
              </div>
            )}

            {/* Share Link */}
            <div className="space-y-2">
              <Label>رابط المشاركة</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={getShareUrl()} 
                  readOnly 
                  className="flex-1 text-sm bg-muted"
                />
                <Button size="sm" onClick={handleCopyLink} className="shrink-0">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShareDialogOpen(false)}
              >
                إغلاق
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  handleCopyLink()
                  setTimeout(() => setShareDialogOpen(false), 1000)
                }}
              >
                <Copy className="size-4 ml-2" />
                نسخ الرابط
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
