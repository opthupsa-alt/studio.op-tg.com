"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Building2, MoreHorizontal, Edit, Trash2, Globe, Users, UserPlus, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClientRecord, updateClientRecord, deleteClientRecord, createClientUser, deleteClientUser } from "@/lib/actions"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { PlatformIcon } from "@/components/platform-icon"
import type { Client, Platform } from "@/lib/types"

interface ClientsContentProps {
  clients: Client[]
  platforms: Platform[]
}

export function ClientsContent({ clients, platforms }: ClientsContentProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newClientName, setNewClientName] = useState("")
  const [newClientColor, setNewClientColor] = useState("#3B82F6")
  
  // Edit state
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [editClientName, setEditClientName] = useState("")
  const [editClientColor, setEditClientColor] = useState("")
  const [editClientStatus, setEditClientStatus] = useState<"active" | "inactive">("active")
  
  // Client User state
  const [isClientUserDialogOpen, setIsClientUserDialogOpen] = useState(false)
  const [selectedClientForUser, setSelectedClientForUser] = useState<Client | null>(null)
  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [showUserPassword, setShowUserPassword] = useState(false)

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setEditClientName(client.name)
    setEditClientColor(client.brand_primary_color || "#3B82F6")
    setEditClientStatus(client.status)
    setIsEditDialogOpen(true)
  }

  const handleAddClientUser = (client: Client) => {
    setSelectedClientForUser(client)
    setNewUserName("")
    setNewUserEmail("")
    setNewUserPassword("")
    setIsClientUserDialogOpen(true)
  }

  const handleCreateClientUser = async () => {
    if (!selectedClientForUser || !newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) return
    
    if (newUserPassword.length < 6) {
      alert("كلمة المرور يجب أن تكون 6 أحرف على الأقل")
      return
    }
    
    setIsSubmitting(true)
    try {
      const result = await createClientUser({
        email: newUserEmail,
        full_name: newUserName,
        client_id: selectedClientForUser.id,
        password: newUserPassword,
      })
      
      if (result.error) {
        console.error("Error creating client user:", result.error)
        alert(result.error)
      } else {
        setIsClientUserDialogOpen(false)
        setSelectedClientForUser(null)
        setNewUserPassword("")
        alert(`تم إنشاء حساب العميل بنجاح!\n\nالبريد: ${newUserEmail}\nكلمة المرور: ${newUserPassword}\n\nيمكن للعميل الآن تسجيل الدخول مباشرة.`)
        router.refresh()
      }
    } catch (error) {
      console.error("Error creating client user:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateClient = async () => {
    if (!editingClient || !editClientName.trim()) return
    
    setIsSubmitting(true)
    try {
      const result = await updateClientRecord(editingClient.id, {
        name: editClientName,
        brand_primary_color: editClientColor,
        status: editClientStatus,
      })
      
      if (result.error) {
        console.error("Error updating client:", result.error)
        alert(result.error)
      } else {
        setIsEditDialogOpen(false)
        setEditingClient(null)
        router.refresh()
      }
    } catch (error) {
      console.error("Error updating client:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return
    
    setIsSubmitting(true)
    try {
      const result = await createClientRecord({
        name: newClientName,
        brand_primary_color: newClientColor,
      })
      
      if (result.error) {
        console.error("Error creating client:", result.error)
        alert(result.error)
      } else {
        setIsDialogOpen(false)
        setNewClientName("")
        setNewClientColor("#3B82F6")
        router.refresh()
      }
    } catch (error) {
      console.error("Error creating client:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا العميل؟ سيتم حذف جميع الخطط والبوستات المرتبطة به.")) return
    
    try {
      const result = await deleteClientRecord(clientId)
      if (result.error) {
        console.error("Error deleting client:", result.error)
        alert(result.error)
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error("Error deleting client:", error)
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
                العملاء
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex-1" />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
              <Plus className="size-4 ml-1 sm:ml-2" />
              <span className="hidden sm:inline">عميل جديد</span>
              <span className="sm:hidden">جديد</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة عميل جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات العميل الجديد
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم العميل</Label>
                <Input
                  id="name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="أدخل اسم العميل..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">لون العلامة التجارية</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="color"
                    value={newClientColor}
                    onChange={(e) => setNewClientColor(e.target.value)}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={newClientColor}
                    onChange={(e) => setNewClientColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCreateClient} disabled={!newClientName.trim() || isSubmitting}>
                {isSubmitting ? "جاري الإضافة..." : "إضافة العميل"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <main className="flex-1 overflow-auto p-3 sm:p-6">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
            <Building2 className="size-12 sm:size-16 mb-4 opacity-50" />
            <p className="text-base sm:text-lg">لا يوجد عملاء</p>
            <p className="text-xs sm:text-sm">ابدأ بإضافة عميل جديد</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {clients.map((client) => (
              <Card key={client.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: client.brand_primary_color || "#3B82F6" }}
                      >
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{client.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Globe className="size-3" />
                          {client.timezone || "Asia/Riyadh"}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClient(client)}>
                          <Edit className="ml-2 size-4" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddClientUser(client)}>
                          <UserPlus className="ml-2 size-4" />
                          إضافة مستخدم عميل
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteClient(client.id)}
                        >
                          <Trash2 className="ml-2 size-4" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">المنصات المفعلة</p>
                      <div className="flex items-center gap-1">
                        {platforms.slice(0, 4).map((platform) => (
                          <PlatformIcon
                            key={platform.id}
                            platform={platform.key}
                            size="sm"
                          />
                        ))}
                        {platforms.length > 4 && (
                          <span className="text-xs text-muted-foreground">
                            +{platforms.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Badge variant={client.status === "active" ? "default" : "secondary"}>
                        {client.status === "active" ? "نشط" : "غير نشط"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Add Client User Dialog */}
      <Dialog open={isClientUserDialogOpen} onOpenChange={setIsClientUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة مستخدم عميل</DialogTitle>
            <DialogDescription>
              إضافة مستخدم جديد للعميل: {selectedClientForUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">اسم المستخدم *</Label>
              <Input
                id="user-name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="أدخل اسم المستخدم..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">البريد الإلكتروني *</Label>
              <Input
                id="user-email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="example@company.com"
                className="text-left"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">كلمة المرور *</Label>
              <div className="relative">
                <Input
                  id="user-password"
                  type={showUserPassword ? "text" : "password"}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور..."
                  className="text-left pl-10"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowUserPassword(!showUserPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showUserPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">يجب أن تكون 6 أحرف على الأقل</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm border border-green-200 dark:border-green-800">
              <p className="font-medium mb-1 text-green-700 dark:text-green-400">✓ تفعيل فوري</p>
              <p className="text-green-600 dark:text-green-500">سيتم تفعيل الحساب مباشرة بدون الحاجة لتأكيد البريد الإلكتروني. يمكن للعميل تسجيل الدخول فوراً.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClientUserDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleCreateClientUser} 
              disabled={!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim() || newUserPassword.length < 6 || isSubmitting}
            >
              {isSubmitting ? "جاري الإضافة..." : "إضافة المستخدم"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل العميل</DialogTitle>
            <DialogDescription>
              تعديل بيانات العميل
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">اسم العميل</Label>
              <Input
                id="edit-name"
                value={editClientName}
                onChange={(e) => setEditClientName(e.target.value)}
                placeholder="أدخل اسم العميل..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">لون العلامة التجارية</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="edit-color"
                  value={editClientColor}
                  onChange={(e) => setEditClientColor(e.target.value)}
                  className="w-12 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={editClientColor}
                  onChange={(e) => setEditClientColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>الحالة</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={editClientStatus === "active"}
                    onChange={() => setEditClientStatus("active")}
                    className="w-4 h-4"
                  />
                  <span>نشط</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={editClientStatus === "inactive"}
                    onChange={() => setEditClientStatus("inactive")}
                    className="w-4 h-4"
                  />
                  <span>غير نشط</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateClient} disabled={!editClientName.trim() || isSubmitting}>
              {isSubmitting ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
