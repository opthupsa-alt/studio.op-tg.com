import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { action, note } = await request.json()

    if (!id || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Missing id or invalid action" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current post
    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("status")
      .eq("id", id)
      .single()

    if (fetchError || !post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      )
    }

    // Verify post is in client_review status
    if (post.status !== "client_review") {
      return NextResponse.json(
        { error: "يمكن الموافقة/الرفض فقط عندما تكون الحالة 'مراجعة العميل'" },
        { status: 400 }
      )
    }

    // Determine new status and lock state
    const newStatus = action === "approve" ? "approved" : "rejected"
    const shouldLock = action === "approve"

    // Update post
    const { error: updateError } = await supabase
      .from("posts")
      .update({
        status: newStatus,
        locked: shouldLock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("Error updating post:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Create or update approval record
    const { error: approvalError } = await supabase
      .from("approvals")
      .upsert({
        post_id: id,
        status: action === "approve" ? "approved" : "rejected",
        note: note || null,
        created_at: new Date().toISOString(),
      }, {
        onConflict: "post_id",
      })

    if (approvalError) {
      console.error("Error creating approval record:", approvalError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ 
      success: true,
      newStatus,
      locked: shouldLock,
    })
  } catch (error) {
    console.error("Error in POST /api/posts/[id]/approve:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
