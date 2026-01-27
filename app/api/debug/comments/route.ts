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
      .select("id, full_name, role, client_id")
      .eq("user_id", user.id)
      .single()

    if (teamMemberError) {
      return NextResponse.json({
        error: "Team member error",
        details: teamMemberError,
        userId: user.id
      })
    }

    // Get all comments (limited)
    const { data: comments, error: commentsError } = await supabase
      .from("comments")
      .select("id, post_id, user_id, scope, comment, created_at")
      .order("created_at", { ascending: false })
      .limit(10)

    // Try to insert a test comment
    const testPostId = "99eba9e6-796d-4029-bc2e-db949229ce41" // From debug earlier
    const { data: insertResult, error: insertError } = await supabase
      .from("comments")
      .insert({
        post_id: testPostId,
        user_id: teamMember.id,
        comment: "Test comment - delete me",
        scope: "client",
      })
      .select()
      .single()

    return NextResponse.json({
      success: true,
      debug: {
        authUserId: user.id,
        userEmail: user.email,
        teamMember: teamMember,
        commentsQuery: {
          error: commentsError?.message,
          count: comments?.length || 0,
          comments: comments
        },
        insertTest: {
          error: insertError?.message,
          errorDetails: insertError,
          result: insertResult
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
