import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ClientPortalContent } from "@/components/client-portal-content"
import { PageLoading } from "@/components/loading-spinner"

async function getClientData() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  // Get team member info
  const { data: teamMember, error: teamMemberError } = await supabase
    .from("team_members")
    .select("*, client:clients(*)")
    .eq("user_id", user.id)
    .single()

  console.log("=== CLIENT PORTAL DEBUG ===")
  console.log("User ID:", user.id)
  console.log("Team Member:", teamMember)
  console.log("Team Member Error:", teamMemberError)
  console.log("Client ID:", teamMember?.client_id)

  if (!teamMember || teamMember.role !== "client" || !teamMember.client_id) {
    console.log("REDIRECT: teamMember check failed")
    return null
  }

  // Check if user is inactive
  if (teamMember.status === "inactive") {
    return { inactive: true }
  }

  // Get current month's plan
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("client_id", teamMember.client_id)
    .eq("year", currentYear)
    .eq("month", currentMonth)
    .single()

  // Get posts for this client
  // Check if visible_to_client column exists, if not show all posts
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select(`
      *,
      plan:plans(*),
      post_platforms(
        platform:platforms(*)
      ),
      comments(
        *,
        user:team_members(*)
      ),
      approvals(*)
    `)
    .eq("client_id", teamMember.client_id)
    .order("publish_date", { ascending: true })
  
  console.log("=== POSTS QUERY DEBUG ===")
  console.log("Querying posts for client_id:", teamMember.client_id)
  console.log("Posts query error:", postsError)
  console.log("Posts count:", posts?.length)
  console.log("First 3 posts:", posts?.slice(0, 3).map(p => ({ id: p.id, title: p.title, client_id: p.client_id })))

  const transformedPosts = (posts || []).map((post: any) => ({
    ...post,
    platforms: post.post_platforms?.map((pp: any) => pp.platform).filter(Boolean) || [],
  }))

  // Get platforms
  const { data: platforms } = await supabase
    .from("platforms")
    .select("*")
    .order("name")

  return {
    client: teamMember.client,
    teamMember,
    plan,
    posts: transformedPosts,
    platforms: platforms || [],
    currentYear,
    currentMonth,
  }
}

export default async function ClientPortalPage() {
  const data = await getClientData()

  if (!data) {
    redirect("/auth/login")
  }

  // Check if user is inactive
  if ('inactive' in data && data.inactive) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">الحساب موقف</h1>
          <p className="text-muted-foreground">
            تم إيقاف حسابك مؤقتاً. يرجى التواصل مع مدير الحساب لمزيد من المعلومات.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<PageLoading />}>
      <ClientPortalContent
        client={data.client}
        posts={data.posts}
        platforms={data.platforms}
        currentYear={data.currentYear}
        currentMonth={data.currentMonth}
      />
    </Suspense>
  )
}
