import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated", user: null })
    }

    // Get team member info
    const { data: teamMember, error: teamMemberError } = await supabase
      .from("team_members")
      .select("*, client:clients(*)")
      .eq("user_id", user.id)
      .single()

    if (teamMemberError) {
      return NextResponse.json({ 
        error: "Team member error",
        details: teamMemberError,
        userId: user.id
      })
    }

    if (!teamMember) {
      return NextResponse.json({ 
        error: "No team member found",
        userId: user.id
      })
    }

    // Get all posts for this client (without any filter)
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, title, status, client_id, publish_date, visible_to_client, awaiting_client_approval")
      .eq("client_id", teamMember.client_id)
      .order("publish_date", { ascending: true })
      .limit(10)

    // Also try to get posts without client_id filter to see all posts
    const { data: allPosts, error: allPostsError } = await supabase
      .from("posts")
      .select("id, title, client_id")
      .limit(5)

    return NextResponse.json({
      success: true,
      debug: {
        userId: user.id,
        userEmail: user.email,
        teamMember: {
          id: teamMember.id,
          role: teamMember.role,
          client_id: teamMember.client_id,
          clientName: teamMember.client?.name
        },
        postsQuery: {
          clientId: teamMember.client_id,
          error: postsError?.message,
          count: posts?.length || 0,
          posts: posts?.map(p => ({
            id: p.id,
            title: p.title,
            status: p.status,
            client_id: p.client_id,
            visible_to_client: p.visible_to_client,
            awaiting_client_approval: p.awaiting_client_approval
          }))
        },
        allPostsQuery: {
          error: allPostsError?.message,
          count: allPosts?.length || 0,
          posts: allPosts
        }
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      error: "Internal error",
      details: error instanceof Error ? error.message : "Unknown error"
    })
  }
}
