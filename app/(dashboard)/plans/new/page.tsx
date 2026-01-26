"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarDays, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Client } from "@/lib/types"

const months = [
  { value: "1", label: "يناير" },
  { value: "2", label: "فبراير" },
  { value: "3", label: "مارس" },
  { value: "4", label: "أبريل" },
  { value: "5", label: "مايو" },
  { value: "6", label: "يونيو" },
  { value: "7", label: "يوليو" },
  { value: "8", label: "أغسطس" },
  { value: "9", label: "سبتمبر" },
  { value: "10", label: "أكتوبر" },
  { value: "11", label: "نوفمبر" },
  { value: "12", label: "ديسمبر" },
]

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 3 }, (_, i) => currentYear + i)

export default function NewPlanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientFromUrl = searchParams.get("client")
  
  const [clients, setClients] = useState<Client[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(true)
  const [selectedClient, setSelectedClient] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchClients = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name")
      
      if (error) {
        console.error("Error fetching clients:", error)
      } else {
        setClients(data || [])
        // Set client from URL if provided
        if (clientFromUrl && data?.some(c => c.id === clientFromUrl)) {
          setSelectedClient(clientFromUrl)
        }
      }
      setIsLoadingClients(false)
    }

    fetchClients()
  }, [clientFromUrl])

  const handleCreatePlan = async () => {
    if (!selectedClient || !selectedMonth || !selectedYear) return

    setIsLoading(true)
    
    try {
      const supabase = createClient()
      
      // Check if plan already exists
      const { data: existingPlans } = await supabase
        .from('plans')
        .select('id')
        .eq('client_id', selectedClient)
        .eq('month', parseInt(selectedMonth))
        .eq('year', parseInt(selectedYear))
      
      if (existingPlans && existingPlans.length > 0) {
        alert('هذه الخطة موجودة بالفعل')
        setIsLoading(false)
        return
      }
      
      // Create new plan
      const { data: newPlan, error } = await supabase
        .from('plans')
        .insert({
          client_id: selectedClient,
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear),
          status: 'active'
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating plan:', error)
        alert('حدث خطأ أثناء إنشاء الخطة: ' + error.message)
        setIsLoading(false)
        return
      }
      
      console.log('Plan created:', newPlan)
      // Navigate to calendar with the selected month and year
      router.push(`/calendar?client=${selectedClient}&year=${selectedYear}&month=${selectedMonth}`)
    } catch (err) {
      console.error('Error:', err)
      alert('حدث خطأ غير متوقع')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger className="-mr-1" />
        <Separator orientation="vertical" className="ml-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">الرئيسية</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold">
                خطة جديدة
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CalendarDays className="size-6 text-primary" />
              </div>
              <CardTitle className="text-xl">إنشاء خطة محتوى جديدة</CardTitle>
              <CardDescription>
                اختر العميل والشهر لإنشاء خطة محتوى جديدة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>العميل</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingClients ? "جاري التحميل..." : "اختر العميل..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingClients ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="size-4 animate-spin" />
                      </div>
                    ) : clients.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        لا يوجد عملاء. <Link href="/clients" className="text-primary hover:underline">أضف عميل جديد</Link>
                      </div>
                    ) : (
                      clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الشهر</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الشهر..." />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>السنة</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                >
                  إلغاء
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreatePlan}
                  disabled={!selectedClient || !selectedMonth || isLoading}
                >
                  {isLoading ? (
                    "جاري الإنشاء..."
                  ) : (
                    <>
                      إنشاء الخطة
                      <ArrowRight className="size-4 mr-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
