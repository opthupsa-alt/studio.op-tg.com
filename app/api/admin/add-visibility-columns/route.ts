import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: teamMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (!teamMember || teamMember.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Update all existing posts - make client_review posts visible and awaiting approval
    const { error: error1, data: data1 } = await supabase
      .from("posts")
      .update({ 
        visible_to_client: true, 
        awaiting_client_approval: true 
      })
      .eq("status", "client_review")
      .select("id")

    // Update approved/scheduled/posted posts to be visible
    const { error: error2, data: data2 } = await supabase
      .from("posts")
      .update({ visible_to_client: true })
      .in("status", ["approved", "scheduled", "posted"])
      .select("id")

    if (error1 || error2) {
      console.error("Errors:", error1, error2)
      return NextResponse.json({ 
        error: "Error updating posts",
        details: { error1: error1?.message, error2: error2?.message }
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Posts visibility updated successfully",
      updated: {
        clientReview: data1?.length || 0,
        approvedPosts: data2?.length || 0
      }
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
