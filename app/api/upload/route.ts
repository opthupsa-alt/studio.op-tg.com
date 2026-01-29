import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createPublicClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get("file") as File
    const postId = formData.get("postId") as string
    const variantId = formData.get("variantId") as string | null

    if (!file || !postId) {
      return NextResponse.json({ error: "Missing file or postId" }, { status: 400 })
    }

    // Check if post exists and get client_id
    const { data: post } = await supabase
      .from("posts")
      .select("locked, client_id")
      .eq("id", postId)
      .single()

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Get user role
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", user.id)
      .single()

    const userRole = teamMember?.role || "client"

    // Check permissions
    if (post.locked && !["admin", "manager"].includes(userRole)) {
      return NextResponse.json({ error: "Cannot upload to locked post" }, { status: 403 })
    }

    if (userRole === "client") {
      return NextResponse.json({ error: "Clients cannot upload files" }, { status: 403 })
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop()
    const fileName = `${post.client_id}/${postId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Use service role client for storage upload
    const storageClient = createPublicClient()
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await storageClient.storage
      .from("post-assets")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error("Error uploading file:", uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = storageClient.storage
      .from("post-assets")
      .getPublicUrl(fileName)

    // Determine file type
    const mimeType = file.type
    let assetType: "image" | "video" | "file" = "file"
    if (mimeType.startsWith("image/")) assetType = "image"
    else if (mimeType.startsWith("video/")) assetType = "video"

    // Create asset record using service role
    const { data: asset, error: assetError } = await storageClient
      .from("assets")
      .insert({
        post_id: postId,
        variant_id: variantId || null,
        type: assetType,
        url: urlData.publicUrl,
        name: file.name,
        size: file.size,
        mime_type: mimeType,
      })
      .select()
      .single()

    if (assetError) {
      console.error("Error creating asset record:", assetError)
      // Try to delete uploaded file
      await storageClient.storage.from("post-assets").remove([fileName])
      return NextResponse.json({ error: assetError.message }, { status: 500 })
    }

    // Revalidate paths
    revalidatePath("/calendar")
    revalidatePath("/list")
    revalidatePath("/grid")
    revalidatePath("/kanban")

    return NextResponse.json({ success: true, asset })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
