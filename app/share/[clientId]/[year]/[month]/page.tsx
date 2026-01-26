import { notFound } from "next/navigation"
import { createPublicClient } from "@/lib/supabase/server"
import { PublicGridView } from "@/components/public-grid-view"
import { SharePasswordForm } from "@/components/share-password-form"

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SharePageProps {
  params: Promise<{
    clientId: string
    year: string
    month: string
  }>
  searchParams: Promise<{
    password?: string
  }>
}

async function getShareData(clientId: string, year: number, month: number) {
  const supabase = createPublicClient()

  // First check if share link exists and is active
  const { data: shareLink, error: shareLinkError } = await supabase
    .from("share_links")
    .select("*")
    .eq("client_id", clientId)
    .eq("year", year)
    .eq("month", month)
    .eq("is_active", true)
    .single()

  // If no active share link exists, return not authorized
  if (shareLinkError || !shareLink) {
    return { notAuthorized: true }
  }

  // Check if link has expired
  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return { notAuthorized: true, expired: true }
  }

  // Get client
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single()

  if (clientError || !client) {
    return { notAuthorized: true }
  }

  // Get plan
  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("client_id", clientId)
    .eq("year", year)
    .eq("month", month)
    .single()

  if (!plan) {
    return { client, posts: [], plan: null, shareLink }
  }

  // Get posts with platforms
  const { data: posts } = await supabase
    .from("posts")
    .select(`
      *,
      post_platforms(
        platform:platforms(*)
      )
    `)
    .eq("plan_id", plan.id)
    .order("publish_date", { ascending: true })

  const transformedPosts = (posts || []).map((post: any) => ({
    ...post,
    platforms: post.post_platforms?.map((pp: any) => pp.platform).filter(Boolean) || [],
  }))

  return { client, posts: transformedPosts, plan, shareLink }
}

const monthNames = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
]

export default async function SharePage({ params, searchParams }: SharePageProps) {
  const { clientId, year, month } = await params
  const { password: urlPassword } = await searchParams

  const yearNum = parseInt(year)
  const monthNum = parseInt(month)

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    notFound()
  }

  const data = await getShareData(clientId, yearNum, monthNum)

  // Check if not authorized (no active share link)
  if (!data || (data as any).notAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-8V7a4 4 0 118 0v2m-8 0V7a4 4 0 118 0v2m-8 0h8" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">رابط غير متاح</h1>
          <p className="text-muted-foreground">
            {(data as any)?.expired ? "انتهت صلاحية هذا الرابط" : "هذا الرابط غير مفعل أو غير موجود"}
          </p>
        </div>
      </div>
    )
  }

  const { client, posts = [], shareLink } = data as any
  const monthName = monthNames[monthNum - 1]

  // Check if password is required from share_links table
  const requiredPassword = shareLink?.password
  const isPasswordProtected = !!requiredPassword

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {client?.logo_url ? (
              <img 
                src={client.logo_url} 
                alt={client.name} 
                className="h-12 w-auto object-contain"
              />
            ) : client?.icon_url ? (
              <img 
                src={client.icon_url} 
                alt={client.name} 
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : client?.brand_primary_color ? (
              <div
                className="w-12 h-12 rounded-xl"
                style={{ backgroundColor: client.brand_primary_color }}
              />
            ) : null}
            <div>
              <h1 className="text-2xl font-bold">{client?.name}</h1>
              <p className="text-muted-foreground">
                خطة المحتوى - {monthName} {yearNum}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {isPasswordProtected ? (
          <SharePasswordForm 
            correctPassword={requiredPassword}
            posts={posts}
            clientColor={client?.brand_primary_color}
          />
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-lg">لا توجد منشورات لهذا الشهر</p>
          </div>
        ) : (
          <PublicGridView posts={posts} clientColor={client?.brand_primary_color} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          <p>تم إنشاء هذه الصفحة بواسطة منصة تخطيط المحتوى</p>
        </div>
      </footer>
    </div>
  )
}
