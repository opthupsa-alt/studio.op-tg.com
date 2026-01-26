"use client"

import { useState, useEffect } from "react"
import { Save, Moon, Sun, Globe, Bell, Shield, Palette, User, Loader2 } from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [teamMember, setTeamMember] = useState<any>(null)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [notifications, setNotifications] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [timezone, setTimezone] = useState("Asia/Riyadh")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")

  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      setUser(user)
      setEmail(user.email || "")

      // Get team member info
      const { data: member } = await supabase
        .from("team_members")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (member) {
        setTeamMember(member)
        setFullName(member.full_name || "")
      }

      setIsLoading(false)
    }

    fetchUserData()
  }, [router])

  const handleSaveProfile = async () => {
    if (!teamMember) return
    
    setIsSaving(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("team_members")
      .update({ full_name: fullName })
      .eq("id", teamMember.id)

    if (error) {
      console.error("Error updating profile:", error)
      alert("حدث خطأ أثناء حفظ البيانات")
    } else {
      alert("تم حفظ البيانات بنجاح")
      router.refresh()
    }
    setIsSaving(false)
  }

  const handleChangePassword = async () => {
    setPasswordError("")
    setPasswordSuccess("")
    
    if (!newPassword || newPassword.length < 6) {
      setPasswordError("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess("تم تغيير كلمة المرور بنجاح")
      setCurrentPassword("")
      setNewPassword("")
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger className="-mr-1" />
        <Separator orientation="vertical" className="ml-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-lg">
                الإعدادات
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="size-5" />
                <CardTitle>الملف الشخصي</CardTitle>
              </div>
              <CardDescription>
                معلومات حسابك الشخصية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  <AvatarImage src={teamMember?.avatar_url} />
                  <AvatarFallback className="text-lg">
                    {fullName?.charAt(0) || email?.charAt(0) || "م"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{fullName || "مستخدم"}</p>
                  <p className="text-sm text-muted-foreground">{email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    الدور: {teamMember?.role === "admin" ? "مدير" : 
                           teamMember?.role === "manager" ? "مشرف" :
                           teamMember?.role === "writer" ? "كاتب محتوى" :
                           teamMember?.role === "designer" ? "مصمم" :
                           teamMember?.role === "client" ? "عميل" : teamMember?.role}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="أدخل اسمك الكامل"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">لا يمكن تغيير البريد الإلكتروني</p>
              </div>
              <Button onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? (
                  <><Loader2 className="size-4 ml-2 animate-spin" />جاري الحفظ...</>
                ) : (
                  <><Save className="size-4 ml-2" />حفظ التغييرات</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="size-5" />
                <CardTitle>المظهر</CardTitle>
              </div>
              <CardDescription>
                تخصيص مظهر التطبيق
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>الوضع الداكن</Label>
                  <p className="text-sm text-muted-foreground">
                    تفعيل الوضع الداكن للتطبيق
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="size-4 text-muted-foreground" />
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                  <Moon className="size-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timezone */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="size-5" />
                <CardTitle>المنطقة الزمنية</CardTitle>
              </div>
              <CardDescription>
                تحديد المنطقة الزمنية للجدولة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Riyadh">الرياض (GMT+3)</SelectItem>
                  <SelectItem value="Asia/Dubai">دبي (GMT+4)</SelectItem>
                  <SelectItem value="Asia/Kuwait">الكويت (GMT+3)</SelectItem>
                  <SelectItem value="Africa/Cairo">القاهرة (GMT+2)</SelectItem>
                  <SelectItem value="Europe/London">لندن (GMT+0)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="size-5" />
                <CardTitle>الإشعارات</CardTitle>
              </div>
              <CardDescription>
                إدارة إعدادات الإشعارات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>إشعارات التطبيق</Label>
                  <p className="text-sm text-muted-foreground">
                    تلقي إشعارات داخل التطبيق
                  </p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>إشعارات البريد الإلكتروني</Label>
                  <p className="text-sm text-muted-foreground">
                    تلقي إشعارات عبر البريد الإلكتروني
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="size-5" />
                <CardTitle>الأمان</CardTitle>
              </div>
              <CardDescription>
                إعدادات الأمان والخصوصية
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة (6 أحرف على الأقل)"
                />
              </div>
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-green-600">{passwordSuccess}</p>
              )}
              <Button variant="outline" onClick={handleChangePassword}>
                تغيير كلمة المرور
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
