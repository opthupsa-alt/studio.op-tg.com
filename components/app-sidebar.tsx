"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  Calendar,
  LayoutGrid,
  Kanban,
  List,
  Users,
  Building2,
  Settings,
  LogOut,
  Plus,
  Moon,
  Sun,
  Home,
  FileText,
} from "lucide-react"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import type { TeamMember } from "@/lib/types"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { NotificationsDropdown } from "@/components/notifications-dropdown"

// الصفحة الرئيسية
const homeItem = {
  title: "الرئيسية",
  url: "/",
  icon: Home,
  roles: ["admin", "manager", "writer", "designer"],
}

// طرق عرض المحتوى
const viewItems = [
  {
    title: "التقويم",
    url: "/calendar",
    icon: Calendar,
    roles: ["admin", "manager", "writer", "designer"],
  },
  {
    title: "الشبكة",
    url: "/grid",
    icon: LayoutGrid,
    roles: ["admin", "manager", "writer", "designer"],
  },
  {
    title: "كانبان",
    url: "/kanban",
    icon: Kanban,
    roles: ["admin", "manager", "writer", "designer"],
  },
  {
    title: "القائمة",
    url: "/list",
    icon: List,
    roles: ["admin", "manager", "writer", "designer"],
  },
]

// إدارة المحتوى
const contentItems = [
  {
    title: "الخطط",
    url: "/plans",
    icon: FileText,
    roles: ["admin", "manager"],
  },
  {
    title: "العملاء",
    url: "/clients",
    icon: Building2,
    roles: ["admin", "manager"],
  },
]

// إدارة النظام
const systemItems = [
  {
    title: "الفريق",
    url: "/team",
    icon: Users,
    roles: ["admin", "manager"],
  },
  {
    title: "الإعدادات",
    url: "/settings",
    icon: Settings,
    roles: ["admin"],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null)

  useEffect(() => {
    setMounted(true)
    
    // جلب بيانات المستخدم الحالي
    const fetchCurrentUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: teamMember } = await supabase
          .from("team_members")
          .select("*")
          .eq("user_id", user.id)
          .single()
        
        if (teamMember) {
          setCurrentUser(teamMember)
        }
      }
    }
    
    fetchCurrentUser()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <Sidebar side="right" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden">
                  <Image 
                    src="/opt-logo.png" 
                    alt="الهدف الأمثل للتسويق" 
                    width={32} 
                    height={32}
                    className="object-contain"
                  />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-bold text-sm">الهدف الأمثل</span>
                  <span className="text-xs text-muted-foreground">للتسويق</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* عرض القائمة فقط بعد التحميل لتجنب Hydration mismatch */}
        {!mounted && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/">
                      <Home className="size-4" />
                      <span>جاري التحميل...</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* للعملاء فقط - بوابة العميل */}
        {mounted && currentUser && currentUser.role === "client" && (
          <SidebarGroup>
            <SidebarGroupLabel>بوابة العميل</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/client-portal"}
                  >
                    <Link href="/client-portal">
                      <Home className="size-4" />
                      <span>المنشورات</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* لأعضاء الفريق - الصفحة الرئيسية */}
        {mounted && currentUser && currentUser.role !== "client" && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/"}
                  >
                    <Link href="/">
                      <Home className="size-4" />
                      <span>الرئيسية</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* طرق عرض المحتوى */}
        {mounted && currentUser && currentUser.role !== "client" && (
          <SidebarGroup>
            <SidebarGroupLabel>عرض المحتوى</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {viewItems
                  .filter(item => item.roles.includes(currentUser.role))
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                      >
                        <Link href={item.url}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* إدارة المحتوى - للمدير والمشرف */}
        {mounted && currentUser && ["admin", "manager"].includes(currentUser.role) && (
          <SidebarGroup>
            <SidebarGroupLabel>إدارة المحتوى</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {contentItems
                  .filter(item => item.roles.includes(currentUser.role))
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                      >
                        <Link href={item.url}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/plans/new"}>
                    <Link href="/plans/new">
                      <Plus className="size-4" />
                      <span>خطة جديدة</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* إدارة النظام - للمدير والمشرف */}
        {mounted && currentUser && ["admin", "manager"].includes(currentUser.role) && (
          <SidebarGroup>
            <SidebarGroupLabel>إدارة النظام</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {systemItems
                  .filter(item => item.roles.includes(currentUser.role))
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                      >
                        <Link href={item.url}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1">
              <NotificationsDropdown />
              <SidebarMenuButton
                className="flex-1"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {mounted ? (
                  theme === "dark" ? (
                    <Sun className="size-4" />
                  ) : (
                    <Moon className="size-4" />
                  )
                ) : (
                  <Moon className="size-4" />
                )}
                <span>{mounted ? (theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن") : "تبديل الوضع"}</span>
              </SidebarMenuButton>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-8">
                    <AvatarImage src={currentUser?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {currentUser?.full_name?.charAt(0) || "م"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-medium text-sm">{currentUser?.full_name || "مستخدم"}</span>
                    <span className="text-xs text-muted-foreground">
                      {currentUser?.role === "admin" ? "مدير" : 
                       currentUser?.role === "manager" ? "مشرف" :
                       currentUser?.role === "writer" ? "كاتب" :
                       currentUser?.role === "designer" ? "مصمم" :
                       currentUser?.role === "client" ? "عميل" : "عضو"}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="ml-2 size-4" />
                    الملف الشخصي
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
                  <LogOut className="ml-2 size-4" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
