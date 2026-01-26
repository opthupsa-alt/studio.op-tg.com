import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardHome } from "@/components/dashboard-home"

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  // Get team member info
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!teamMember) {
    redirect("/auth/login")
  }

  // Redirect client to client portal
  if (teamMember.role === "client") {
    redirect("/client-portal")
  }

  // Get statistics based on role
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  // Get all posts (filtered by role access)
  let postsQuery = supabase.from("posts").select("*, plan:plans(*)", { count: "exact" })
  
  // For writer/designer, filter by assigned posts or client access
  if (teamMember.role === "writer") {
    postsQuery = postsQuery.eq("assigned_writer", teamMember.id)
  } else if (teamMember.role === "designer") {
    postsQuery = postsQuery.eq("assigned_designer", teamMember.id)
  }

  const { data: posts, count: totalPosts } = await postsQuery

  // Get posts by status
  const statusCounts = {
    idea: 0,
    draft: 0,
    design: 0,
    internal_review: 0,
    client_review: 0,
    approved: 0,
    scheduled: 0,
    posted: 0,
    rejected: 0,
  }

  posts?.forEach((post) => {
    if (statusCounts[post.status as keyof typeof statusCounts] !== undefined) {
      statusCounts[post.status as keyof typeof statusCounts]++
    }
  })

  // Get this month's posts
  const thisMonthPosts = posts?.filter((post) => {
    if (!post.publish_date) return false
    const postDate = new Date(post.publish_date)
    return postDate.getMonth() + 1 === currentMonth && postDate.getFullYear() === currentYear
  }) || []

  // Get upcoming posts (next 7 days)
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const upcomingPosts = posts?.filter((post) => {
    if (!post.publish_date) return false
    const postDate = new Date(post.publish_date)
    return postDate >= now && postDate <= nextWeek
  }) || []

  // Get overdue posts (past date but not posted)
  const overduePosts = posts?.filter((post) => {
    if (!post.publish_date) return false
    const postDate = new Date(post.publish_date)
    return postDate < now && !["posted", "approved", "scheduled"].includes(post.status)
  }) || []

  // Get clients count (for admin/manager)
  let clientsCount = 0
  let teamCount = 0
  let plansCount = 0

  if (["admin", "manager"].includes(teamMember.role)) {
    const { count: clients } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
    clientsCount = clients || 0

    const { count: team } = await supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
    teamCount = team || 0

    const { count: plans } = await supabase
      .from("plans")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
    plansCount = plans || 0
  }

  // Get recent activity (comments)
  const { data: recentComments } = await supabase
    .from("comments")
    .select("*, post:posts(title), user:team_members(full_name)")
    .order("created_at", { ascending: false })
    .limit(5)

  // Get pending approvals (for admin/manager)
  const pendingReviewCount = statusCounts.internal_review + statusCounts.client_review

  const stats = {
    totalPosts: totalPosts || 0,
    thisMonthPosts: thisMonthPosts.length,
    upcomingPosts: upcomingPosts.length,
    overduePosts: overduePosts.length,
    pendingReview: pendingReviewCount,
    approvedPosts: statusCounts.approved,
    postedPosts: statusCounts.posted,
    rejectedPosts: statusCounts.rejected,
    clientsCount,
    teamCount,
    plansCount,
    statusCounts,
  }

  return (
    <DashboardHome 
      user={teamMember} 
      stats={stats} 
      upcomingPosts={upcomingPosts.slice(0, 5)}
      overduePosts={overduePosts.slice(0, 5)}
      recentComments={recentComments || []}
    />
  )
}
