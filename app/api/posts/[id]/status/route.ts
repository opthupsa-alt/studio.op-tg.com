import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateStatusTransition } from "@/lib/workflow"
import type { PostStatus } from "@/lib/types"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status } = await request.json()

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing id or status" },
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

    // Get current post
    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("status, locked")
      .eq("id", id)
      .single()

    if (fetchError || !post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      )
    }

    // Validate transition with actual user role
    const validation = validateStatusTransition(
      post.status as PostStatus,
      status as PostStatus,
      userRole,
      post.locked || false
    )

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Update post with status and lock state
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    if (validation.shouldLock) {
      updateData.locked = true
    } else if (validation.shouldUnlock) {
      updateData.locked = false
    }

    const { error } = await supabase
      .from("posts")
      .update(updateData)
      .eq("id", id)

    if (error) {
      console.error("Error updating post status:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in PATCH /api/posts/[id]/status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
