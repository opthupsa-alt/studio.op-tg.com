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

  // Get client
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single()

  if (clientError || !client) {
    return null
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
    return { client, posts: [], plan: null }
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

  return { client, posts: transformedPosts, plan }
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

  if (!data) {
    notFound()
  }

  const { client, posts, plan } = data
  const monthName = monthNames[monthNum - 1]

  // Check if password is required (passed in URL means it's protected)
  const requiredPassword = urlPassword
  const isPasswordProtected = !!requiredPassword

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {client.brand_primary_color && (
              <div
                className="w-12 h-12 rounded-xl"
                style={{ backgroundColor: client.brand_primary_color }}
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">{client.name}</h1>
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
            clientColor={client.brand_primary_color}
          />
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-lg">لا توجد منشورات لهذا الشهر</p>
          </div>
        ) : (
          <PublicGridView posts={posts} clientColor={client.brand_primary_color} />
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
