import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { publish_date } = await request.json()

    if (!id || !publish_date) {
      return NextResponse.json(
        { error: "Missing id or publish_date" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user and their role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { data: teamMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", user.id)
      .single()

    const userRole = teamMember?.role || "client"

    // Check if user can edit (client cannot change dates)
    if (userRole === "client") {
      return NextResponse.json(
        { error: "Clients cannot change post dates" },
        { status: 403 }
      )
    }

    // Check if post is locked (only admin/manager can edit locked posts)
    const { data: post } = await supabase
      .from("posts")
      .select("locked")
      .eq("id", id)
      .single()

    if (post?.locked && !["admin", "manager"].includes(userRole)) {
      return NextResponse.json(
        { error: "Cannot edit locked post" },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from("posts")
      .update({ publish_date, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      console.error("Error updating post date:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in PATCH /api/posts/[id]/date:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
