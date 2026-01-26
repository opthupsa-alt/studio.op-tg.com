import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PublicGridView } from "@/components/public-grid-view"

interface SharePageProps {
  params: Promise<{
    token: string
  }>
}

interface ShareValidation {
  is_valid: boolean
  share_link_id: string | null
  client_id: string | null
  year: number | null
  month: number | null
  scopes: string[] | null
}

async function validateAndGetShareData(token: string) {
  const supabase = await createClient()

  // Validate token using the database function
  const { data: validationResult, error: validationError } = await supabase
    .rpc('validate_share_token', { p_token: token })

  if (validationError) {
    console.error("Token validation error:", validationError)
    return null
  }

  // Handle array result from RPC
  const validation = Array.isArray(validationResult) ? validationResult[0] : validationResult

  if (!validation || !validation.is_valid || !validation.client_id || !validation.year || !validation.month) {
    return null
  }

  const { client_id, year, month } = validation

  // Get client using service role for public access
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", client_id)
    .single()

  if (clientError || !client) {
    return null
  }

  // Get plan
  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("client_id", client_id)
    .eq("year", year)
    .eq("month", month)
    .single()

  if (!plan) {
    return { client, posts: [], plan: null, year, month }
  }

  // Get posts with platforms (only approved/scheduled/posted for client view)
  const { data: posts } = await supabase
    .from("posts")
    .select(`
      id,
      title,
      publish_date,
      status,
      post_type,
      main_goal,
      post_platforms(
        platform:platforms(*)
      )
    `)
    .eq("plan_id", plan.id)
    .in("status", ["client_review", "approved", "scheduled", "posted"])
    .order("publish_date", { ascending: true })

  const transformedPosts = (posts || []).map((post: any) => ({
    ...post,
    platforms: post.post_platforms?.map((pp: any) => pp.platform).filter(Boolean) || [],
  }))

  return { client, posts: transformedPosts, plan, year, month }
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params

  if (!token || token.length < 20) {
    notFound()
  }

  const data = await validateAndGetShareData(token)

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-destructive mb-4">رابط غير صالح</h1>
          <p className="text-muted-foreground">
            هذا الرابط غير صالح أو منتهي الصلاحية.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            يرجى التواصل مع فريق التسويق للحصول على رابط جديد.
          </p>
        </div>
      </div>
    )
  }

  const { client, posts, year, month } = data

  // Get month name in Arabic
  const monthNames = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ]
  const monthName = monthNames[month - 1]

  return (
    <div className="min-h-screen bg-background" dir="rtl">
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
                خطة المحتوى - {monthName} {year}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-lg">لا توجد منشورات جاهزة للعرض في هذا الشهر</p>
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
