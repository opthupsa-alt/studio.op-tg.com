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
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("*, client:clients(*)")
    .eq("user_id", user.id)
    .single()

  if (!teamMember || teamMember.role !== "client" || !teamMember.client_id) {
    return null
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
  const { data: posts } = await supabase
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
