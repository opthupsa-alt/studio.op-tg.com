"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Users, MoreHorizontal, Edit, Trash2, Mail, Eye, EyeOff, Building2, UserCog } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createTeamMemberWithAuth, updateTeamMember, deleteTeamMember, updateTeamMemberClients } from "@/lib/actions"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import type { TeamMember, Client } from "@/lib/types"

interface TeamMemberClient {
  id: string
  team_member_id: string
  client_id: string
}

interface TeamContentProps {
  teamMembers: TeamMember[]
  clients: Client[]
  teamMemberClients: TeamMemberClient[]
}

const roleLabels: Record<string, string> = {
  admin: "مدير",
  manager: "مشرف",
  writer: "كاتب محتوى",
  designer: "مصمم",
  client: "عميل",
}

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  writer: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  designer: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  client: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
}

export function TeamContent({ teamMembers, clients, teamMemberClients }: TeamContentProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // New member state
  const [newMemberName, setNewMemberName] = useState("")
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [newMemberPassword, setNewMemberPassword] = useState("")
  const [newMemberRole, setNewMemberRole] = useState("")
  
  // Edit member state
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [editMemberName, setEditMemberName] = useState("")
  const [editMemberEmail, setEditMemberEmail] = useState("")
  const [editMemberRole, setEditMemberRole] = useState("")
  
  // Assign clients state
  const [assigningMember, setAssigningMember] = useState<TeamMember | null>(null)
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member)
    setEditMemberName(member.full_name)
    setEditMemberEmail(member.email || "")
    setEditMemberRole(member.role)
    setIsEditDialogOpen(true)
  }

  const handleUpdateMember = async () => {
    if (!editingMember || !editMemberName.trim() || !editMemberRole) return
    
    setIsSubmitting(true)
    try {
      const result = await updateTeamMember(editingMember.id, {
        full_name: editMemberName,
        email: editMemberEmail || undefined,
        role: editMemberRole as "admin" | "manager" | "writer" | "designer" | "client",
      })
      
      if (result.error) {
        console.error("Error updating member:", result.error)
        alert(result.error)
      } else {
        setIsEditDialogOpen(false)
        setEditingMember(null)
        router.refresh()
      }
    } catch (error) {
      console.error("Error updating member:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateMember = async () => {
    if (!newMemberName.trim() || !newMemberEmail.trim() || !newMemberPassword.trim() || !newMemberRole) return
    
    setIsSubmitting(true)
    try {
      const result = await createTeamMemberWithAuth({
        full_name: newMemberName,
        email: newMemberEmail,
        password: newMemberPassword,
        role: newMemberRole as "admin" | "manager" | "writer" | "designer" | "client",
      })
      
      if (result.error) {
        console.error("Error creating member:", result.error)
        alert(result.error)
      } else {
        setIsDialogOpen(false)
        setNewMemberName("")
        setNewMemberEmail("")
        setNewMemberPassword("")
        setNewMemberRole("")
        alert("تم إنشاء العضو بنجاح! يمكنه الآن تسجيل الدخول.")
        router.refresh()
      }
    } catch (error) {
      console.error("Error creating member:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا العضو؟")) return
    
    try {
      const result = await deleteTeamMember(memberId)
      if (result.error) {
        console.error("Error deleting member:", result.error)
        alert(result.error)
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error("Error deleting member:", error)
    }
  }

  const handleAssignClients = (member: TeamMember) => {
    setAssigningMember(member)
    // Get current assigned clients for this member
    const currentAssignments = teamMemberClients
      .filter(tmc => tmc.team_member_id === member.id)
      .map(tmc => tmc.client_id)
    setSelectedClientIds(currentAssignments)
    setIsAssignDialogOpen(true)
  }

  const handleSaveAssignments = async () => {
    if (!assigningMember) return
    
    setIsSubmitting(true)
    try {
      const result = await updateTeamMemberClients(assigningMember.id, selectedClientIds)
      if (result.error) {
        console.error("Error updating assignments:", result.error)
        alert(result.error)
      } else {
        setIsAssignDialogOpen(false)
        setAssigningMember(null)
        setSelectedClientIds([])
        router.refresh()
      }
    } catch (error) {
      console.error("Error updating assignments:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds(prev => 
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  const getMemberAssignedClients = (memberId: string) => {
    return teamMemberClients
      .filter(tmc => tmc.team_member_id === memberId)
      .map(tmc => clients.find(c => c.id === tmc.client_id))
      .filter(Boolean)
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
                الفريق
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex-1" />

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
              <Plus className="size-4 ml-1 sm:ml-2" />
              <span className="hidden sm:inline">عضو جديد</span>
              <span className="sm:hidden">جديد</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة عضو جديد</DialogTitle>
              <DialogDescription>
                أدخل بيانات العضو الجديد
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input
                  id="name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="أدخل الاسم..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="text-left"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={newMemberPassword}
                    onChange={(e) => setNewMemberPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور..."
                    className="text-left pl-10"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">يجب أن تكون 6 أحرف على الأقل</p>
              </div>
              <div className="space-y-2">
                <Label>الدور *</Label>
                <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الدور..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">مدير</SelectItem>
                    <SelectItem value="manager">مشرف</SelectItem>
                    <SelectItem value="writer">كاتب محتوى</SelectItem>
                    <SelectItem value="designer">مصمم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleCreateMember} 
                disabled={!newMemberName.trim() || !newMemberEmail.trim() || !newMemberPassword.trim() || newMemberPassword.length < 6 || !newMemberRole || isSubmitting}
              >
                {isSubmitting ? "جاري الإضافة..." : "إضافة العضو"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <main className="flex-1 overflow-auto p-3 sm:p-6">
        {teamMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
            <Users className="size-12 sm:size-16 mb-4 opacity-50" />
            <p className="text-base sm:text-lg">لا يوجد أعضاء</p>
            <p className="text-xs sm:text-sm">ابدأ بإضافة عضو جديد للفريق</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {teamMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-lg transition-shadow relative">
                {/* Dropdown Menu - positioned inside card */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 left-2 z-10"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => handleEditMember(member)}>
                      <Edit className="ml-2 size-4" />
                      تعديل
                    </DropdownMenuItem>
                    {(member.role === "writer" || member.role === "designer") && (
                      <DropdownMenuItem onClick={() => handleAssignClients(member)}>
                        <Building2 className="ml-2 size-4" />
                        تعيين العملاء
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleDeleteMember(member.id)}
                    >
                      <Trash2 className="ml-2 size-4" />
                      حذف
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <CardHeader className="pb-3 pt-4">
                  <div className="flex flex-col items-center text-center">
                    <Avatar className="size-16 mb-3">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                        {member.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-base">{member.full_name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                      <Mail className="size-3" />
                      <span className="truncate max-w-[150px]" dir="ltr">
                        {member.email || "لا يوجد بريد"}
                      </span>
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex justify-center">
                    <Badge className={roleColors[member.role] || ""}>
                      {roleLabels[member.role] || member.role}
                    </Badge>
                  </div>
                  {(member.role === "writer" || member.role === "designer") && (
                    <div className="border-t pt-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <Building2 className="size-3" />
                        <span>العملاء المخصصين:</span>
                      </div>
                      {(() => {
                        const assignedClients = getMemberAssignedClients(member.id)
                        if (assignedClients.length === 0) {
                          return (
                            <p className="text-xs text-muted-foreground text-center">
                              لم يتم تعيين عملاء
                            </p>
                          )
                        }
                        return (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {assignedClients.slice(0, 3).map((client) => (
                              <Badge key={client?.id} variant="outline" className="text-xs">
                                {client?.name}
                              </Badge>
                            ))}
                            {assignedClients.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{assignedClients.length - 3}
                              </Badge>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل العضو</DialogTitle>
            <DialogDescription>
              تعديل بيانات العضو
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">الاسم الكامل</Label>
              <Input
                id="edit-name"
                value={editMemberName}
                onChange={(e) => setEditMemberName(e.target.value)}
                placeholder="أدخل الاسم..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">البريد الإلكتروني</Label>
              <Input
                id="edit-email"
                type="email"
                value={editMemberEmail}
                onChange={(e) => setEditMemberEmail(e.target.value)}
                placeholder="example@company.com"
                className="text-left"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>الدور</Label>
              <Select value={editMemberRole} onValueChange={setEditMemberRole}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الدور..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير</SelectItem>
                  <SelectItem value="manager">مشرف</SelectItem>
                  <SelectItem value="writer">كاتب محتوى</SelectItem>
                  <SelectItem value="designer">مصمم</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleUpdateMember} 
              disabled={!editMemberName.trim() || !editMemberRole || isSubmitting}
            >
              {isSubmitting ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Clients Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="size-5" />
              تعيين العملاء
            </DialogTitle>
            <DialogDescription>
              اختر العملاء الذين سيعمل معهم {assigningMember?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {clients.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                لا يوجد عملاء. قم بإضافة عملاء أولاً.
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => toggleClientSelection(client.id)}
                  >
                    <Checkbox
                      checked={selectedClientIds.includes(client.id)}
                      onCheckedChange={() => toggleClientSelection(client.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.status === "active" ? "نشط" : "غير نشط"}
                      </p>
                    </div>
                    <Building2 className="size-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleSaveAssignments} 
              disabled={isSubmitting}
            >
              {isSubmitting ? "جاري الحفظ..." : `حفظ (${selectedClientIds.length} عميل)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
