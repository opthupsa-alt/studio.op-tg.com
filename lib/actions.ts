"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { Post, PostStatus } from "@/lib/types"

function revalidateAll() {
  // Revalidate all dashboard routes
  revalidatePath("/", "layout")
  revalidatePath("/calendar", "page")
  revalidatePath("/grid", "page")
  revalidatePath("/kanban", "page")
  revalidatePath("/list", "page")
  revalidatePath("/clients", "page")
  revalidatePath("/team", "page")
  revalidatePath("/client-portal", "page")
}

export async function createPost(data: {
  plan_id: string
  client_id: string
  title: string
  description?: string
  main_goal?: string
  post_type?: string
  status: PostStatus
  publish_date: string
  platform_ids?: string[]
}) {
  const supabase = await createClient()

  // Create the post
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      plan_id: data.plan_id,
      client_id: data.client_id,
      title: data.title,
      description: data.description,
      main_goal: data.main_goal,
      post_type: data.post_type || "post",
      status: data.status,
      publish_date: data.publish_date,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating post:", error)
    return { error: error.message }
  }

  // Add platform associations
  if (data.platform_ids && data.platform_ids.length > 0) {
    const { error: platformError } = await supabase.from("post_platforms").insert(
      data.platform_ids.map((platformId) => ({
        post_id: post.id,
        platform_id: platformId,
      }))
    )

    if (platformError) {
      console.error("Error adding platforms to post:", platformError)
    }
  }

  revalidateAll()
  return { data: post }
}

export async function updatePost(
  id: string,
  data: {
    title?: string
    description?: string
    main_goal?: string
    post_type?: string
    status?: PostStatus
    publish_date?: string | null
    platform_ids?: string[]
  }
) {
  console.log("updatePost called with:", { id, data })
  const supabase = await createClient()

  // Get current user's role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("id, role")
    .eq("user_id", user.id)
    .single()

  if (!teamMember) return { error: "Team member not found" }

  // Client cannot update posts at all
  if (teamMember.role === "client") {
    return { error: "Clients cannot update posts" }
  }

  // Check if post is locked
  const { data: existingPost } = await supabase
    .from("posts")
    .select("locked, status")
    .eq("id", id)
    .single()

  if (existingPost?.locked) {
    // Only admin/manager can update locked posts
    if (!["admin", "manager"].includes(teamMember.role)) {
      return { error: "This post is locked. Only admin/manager can modify it." }
    }
  }

  // Extract platform_ids from data to handle separately
  const { platform_ids, ...postData } = data

  const { data: post, error } = await supabase
    .from("posts")
    .update({
      ...postData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating post:", error)
    return { error: error.message }
  }

  // Update platform associations if provided
  if (platform_ids !== undefined) {
    // Delete existing platform associations
    await supabase.from("post_platforms").delete().eq("post_id", id)
    
    // Add new platform associations
    if (platform_ids.length > 0) {
      await supabase.from("post_platforms").insert(
        platform_ids.map((platformId) => ({
          post_id: id,
          platform_id: platformId,
        }))
      )
    }
  }

  revalidateAll()
  return { data: post }
}

export async function deletePost(id: string) {
  const supabase = await createClient()

  // First, get all assets associated with this post
  const { data: assets } = await supabase
    .from("assets")
    .select("id, url")
    .eq("post_id", id)

  // Delete files from storage if any
  if (assets && assets.length > 0) {
    const filePaths = assets
      .map(asset => {
        // Extract path from URL: https://xxx.supabase.co/storage/v1/object/public/post-assets/path
        const match = asset.url?.match(/post-assets\/(.+)$/)
        return match ? match[1] : null
      })
      .filter(Boolean) as string[]

    if (filePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("post-assets")
        .remove(filePaths)

      if (storageError) {
        console.error("Error deleting storage files:", storageError)
        // Continue with post deletion even if storage cleanup fails
      }
    }
  }

  // Delete the post (assets will be cascade deleted via FK)
  const { error } = await supabase.from("posts").delete().eq("id", id)

  if (error) {
    console.error("Error deleting post:", error)
    return { error: error.message }
  }

  revalidateAll()
  return { success: true }
}

export async function updatePostStatus(id: string, status: PostStatus) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("posts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error("Error updating post status:", error)
    return { error: error.message }
  }

  revalidateAll()
  return { success: true }
}

export async function updatePostDate(id: string, publish_date: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("posts")
    .update({ publish_date, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error("Error updating post date:", error)
    return { error: error.message }
  }

  revalidateAll()
  return { success: true }
}

export async function submitForReview(id: string) {
  return updatePostStatus(id, "client_review")
}

export async function submitMultipleForReview(postIds: string[]) {
  const supabase = await createClient()

  // Check if current user is admin/manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || !["admin", "manager"].includes(currentMember.role)) {
    return { error: "Only admins and managers can send posts for review" }
  }

  // Update all posts to client_review status
  const { error } = await supabase
    .from("posts")
    .update({ status: "client_review" })
    .in("id", postIds)

  if (error) {
    console.error("Error submitting posts for review:", error)
    return { error: error.message }
  }

  revalidatePath("/")
  revalidatePath("/calendar")
  revalidatePath("/grid")
  revalidatePath("/kanban")
  revalidatePath("/list")
  
  return { success: true, count: postIds.length }
}

export async function approvePost(id: string, feedback?: string) {
  const supabase = await createClient()

  // Get current user's team member id
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("id, role, client_id")
    .eq("user_id", user.id)
    .single()

  if (!teamMember) return { error: "Team member not found" }

  // Verify user has permission to approve (client or admin/manager)
  if (!["admin", "manager", "client"].includes(teamMember.role)) {
    return { error: "You don't have permission to approve posts" }
  }

  // If client, verify they can only approve their own client's posts
  if (teamMember.role === "client" && teamMember.client_id) {
    const { data: post } = await supabase
      .from("posts")
      .select("client_id")
      .eq("id", id)
      .single()
    
    if (!post || post.client_id !== teamMember.client_id) {
      return { error: "You can only approve your own client's posts" }
    }
  }

  // Update post status and lock it
  const { error: updateError } = await supabase
    .from("posts")
    .update({ 
      status: "approved", 
      locked: true,
      updated_at: new Date().toISOString() 
    })
    .eq("id", id)

  if (updateError) {
    console.error("Error approving post:", updateError)
    return { error: updateError.message }
  }

  // Create or update approval record with approver_id
  const { error: approvalError } = await supabase
    .from("approvals")
    .upsert({
      post_id: id,
      approver_id: teamMember.id,
      status: "approved",
      note: feedback,
      created_at: new Date().toISOString(),
    }, { onConflict: "post_id" })

  if (approvalError) {
    console.error("Error creating approval record:", approvalError)
  }

  revalidateAll()
  return { success: true }
}

export async function rejectPost(id: string, feedback: string) {
  const supabase = await createClient()

  // Get current user's team member id
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: teamMember } = await supabase
    .from("team_members")
    .select("id, role, client_id")
    .eq("user_id", user.id)
    .single()

  if (!teamMember) return { error: "Team member not found" }

  // Verify user has permission to reject (client or admin/manager)
  if (!["admin", "manager", "client"].includes(teamMember.role)) {
    return { error: "You don't have permission to reject posts" }
  }

  // If client, verify they can only reject their own client's posts
  if (teamMember.role === "client" && teamMember.client_id) {
    const { data: post } = await supabase
      .from("posts")
      .select("client_id")
      .eq("id", id)
      .single()
    
    if (!post || post.client_id !== teamMember.client_id) {
      return { error: "You can only reject your own client's posts" }
    }
  }

  // Update post status (rejected posts are NOT locked - can be revised)
  const { error: updateError } = await supabase
    .from("posts")
    .update({ 
      status: "rejected", 
      locked: false,
      updated_at: new Date().toISOString() 
    })
    .eq("id", id)

  if (updateError) {
    console.error("Error rejecting post:", updateError)
    return { error: updateError.message }
  }

  // Create approval record with approver_id
  const { error: approvalError } = await supabase.from("approvals").insert({
    post_id: id,
    approver_id: teamMember.id,
    status: "rejected",
    note: feedback,
  })

  if (approvalError) {
    console.error("Error creating approval record:", approvalError)
  }

  revalidateAll()
  return { success: true }
}

export async function addComment(postId: string, content: string, scope: "internal" | "client" = "internal") {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  // Get user's role
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  // Client can only add client-scope comments
  if (teamMember?.role === "client" && scope === "internal") {
    return { error: "Clients can only add client-scope comments" }
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      comment: content,
      scope,
    })
    .select()
    .single()

  if (error) {
    console.error("Error adding comment:", error)
    return { error: error.message }
  }

  revalidateAll()
  return { data }
}

export async function createPostVariant(data: {
  post_id: string
  platform_id: string
  caption?: string
  hashtags?: string
  cta?: string
  design_notes?: string
}) {
  const supabase = await createClient()

  const { data: variant, error } = await supabase
    .from("post_variants")
    .insert({
      post_id: data.post_id,
      platform_id: data.platform_id,
      caption: data.caption,
      hashtags: data.hashtags,
      cta: data.cta,
      design_notes: data.design_notes,
      status: "draft",
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating variant:", error)
    return { error: error.message }
  }

  revalidateAll()
  return { data: variant }
}

export async function updatePostVariant(
  id: string,
  data: {
    caption?: string
    hashtags?: string
    cta?: string
    design_notes?: string
    status?: "draft" | "ready" | "approved"
  }
) {
  const supabase = await createClient()

  const { data: variant, error } = await supabase
    .from("post_variants")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating variant:", error)
    return { error: error.message }
  }

  revalidateAll()
  return { data: variant }
}

// =====================================================
// Team Members CRUD
// =====================================================

export async function createTeamMember(data: {
  full_name: string
  email?: string
  role: "admin" | "manager" | "writer" | "designer" | "client"
  client_id?: string
}) {
  const supabase = await createClient()

  // Check if current user is admin/manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || !["admin", "manager"].includes(currentMember.role)) {
    return { error: "Only admins and managers can create team members" }
  }

  const { data: member, error } = await supabase
    .from("team_members")
    .insert({
      full_name: data.full_name,
      email: data.email,
      role: data.role,
      client_id: data.client_id,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating team member:", error)
    return { error: error.message }
  }

  revalidatePath("/team")
  return { data: member }
}

export async function createTeamMemberWithAuth(data: {
  full_name: string
  email: string
  password: string
  role: "admin" | "manager" | "writer" | "designer" | "client"
  client_id?: string
}) {
  const supabase = await createClient()

  // Check if current user is admin/manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || !["admin", "manager"].includes(currentMember.role)) {
    return { error: "Only admins and managers can create team members" }
  }

  // Create auth user using signUp (this will auto-confirm if email confirmations are disabled)
  // Note: For production, you may want to use admin API with service role key
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.full_name,
        role: data.role,
      },
      emailRedirectTo: undefined, // No email redirect needed
    }
  })

  if (authError) {
    console.error("Error creating auth user:", authError)
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: "Failed to create user" }
  }

  // Create team member linked to auth user
  const { data: member, error } = await supabase
    .from("team_members")
    .insert({
      user_id: authData.user.id,
      full_name: data.full_name,
      email: data.email,
      role: data.role,
      client_id: data.client_id,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating team member:", error)
    return { error: error.message }
  }

  revalidatePath("/team")
  return { data: member }
}

export async function updateTeamMember(
  id: string,
  data: {
    full_name?: string
    email?: string
    role?: "admin" | "manager" | "writer" | "designer" | "client"
    client_id?: string | null
  }
) {
  const supabase = await createClient()

  // Check if current user is admin/manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || !["admin", "manager"].includes(currentMember.role)) {
    return { error: "Only admins and managers can update team members" }
  }

  const { data: member, error } = await supabase
    .from("team_members")
    .update(data)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating team member:", error)
    return { error: error.message }
  }

  revalidatePath("/team")
  return { data: member }
}

export async function deleteTeamMember(id: string) {
  const supabase = await createClient()

  // Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || currentMember.role !== "admin") {
    return { error: "Only admins can delete team members" }
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting team member:", error)
    return { error: error.message }
  }

  revalidatePath("/team")
  return { success: true }
}

export async function assignTeamMemberToClient(teamMemberId: string, clientId: string) {
  const supabase = await createClient()

  // Check if current user is admin/manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || !["admin", "manager"].includes(currentMember.role)) {
    return { error: "Only admins and managers can assign team members" }
  }

  const { error } = await supabase
    .from("team_member_clients")
    .insert({
      team_member_id: teamMemberId,
      client_id: clientId,
    })

  if (error) {
    console.error("Error assigning team member to client:", error)
    return { error: error.message }
  }

  revalidatePath("/team")
  return { success: true }
}

export async function unassignTeamMemberFromClient(teamMemberId: string, clientId: string) {
  const supabase = await createClient()

  // Check if current user is admin/manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || !["admin", "manager"].includes(currentMember.role)) {
    return { error: "Only admins and managers can unassign team members" }
  }

  const { error } = await supabase
    .from("team_member_clients")
    .delete()
    .eq("team_member_id", teamMemberId)
    .eq("client_id", clientId)

  if (error) {
    console.error("Error unassigning team member from client:", error)
    return { error: error.message }
  }

  revalidatePath("/team")
  return { success: true }
}

// =====================================================
// Clients CRUD
// =====================================================

export async function createClientRecord(data: {
  name: string
  brand_primary_color?: string
  timezone?: string
}) {
  const supabase = await createClient()

  // Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || currentMember.role !== "admin") {
    return { error: "Only admins can create clients" }
  }

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      name: data.name,
      brand_primary_color: data.brand_primary_color || "#3B82F6",
      timezone: data.timezone || "Asia/Riyadh",
      status: "active",
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating client:", error)
    return { error: error.message }
  }

  revalidatePath("/clients")
  return { data: client }
}

export async function updateClientRecord(
  id: string,
  data: {
    name?: string
    brand_primary_color?: string
    timezone?: string
    status?: "active" | "inactive"
    logo_url?: string | null
    icon_url?: string | null
  }
) {
  const supabase = await createClient()

  // Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || currentMember.role !== "admin") {
    return { error: "Only admins can update clients" }
  }

  const { data: client, error } = await supabase
    .from("clients")
    .update(data)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating client:", error)
    return { error: error.message }
  }

  revalidatePath("/clients")
  return { data: client }
}

export async function deleteClientRecord(id: string) {
  const supabase = await createClient()

  // Check if current user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || currentMember.role !== "admin") {
    return { error: "Only admins can delete clients" }
  }

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting client:", error)
    return { error: error.message }
  }

  revalidatePath("/clients")
  return { success: true }
}

// =====================================================
// Client Users Management
// =====================================================

export async function createClientUser(data: {
  email: string
  full_name: string
  client_id: string
  password: string
}) {
  // Use server API route that has admin privileges
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/create-client-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()
    
    if (!response.ok) {
      return { error: result.error || 'Failed to create user' }
    }

    revalidatePath("/clients")
    return { data: result.data }
  } catch (error) {
    console.error("Error creating client user:", error)
    return { error: "Failed to create user" }
  }
}

export async function getClientUsers(clientId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("client_id", clientId)
    .eq("role", "client")
    .order("full_name")

  if (error) {
    console.error("Error fetching client users:", error)
    return { error: error.message }
  }

  return { data }
}

export async function deleteClientUser(userId: string) {
  const supabase = await createClient()

  // Check if current user is admin/manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || !["admin", "manager"].includes(currentMember.role)) {
    return { error: "Only admins and managers can delete client users" }
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", userId)
    .eq("role", "client")

  if (error) {
    console.error("Error deleting client user:", error)
    return { error: error.message }
  }

  revalidatePath("/clients")
  return { success: true }
}

export async function toggleClientUserStatus(userId: string, status: "active" | "inactive") {
  const supabase = await createClient()

  // Check if current user is admin/manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || !["admin", "manager"].includes(currentMember.role)) {
    return { error: "Only admins and managers can update client users" }
  }

  const { error } = await supabase
    .from("team_members")
    .update({ status })
    .eq("id", userId)
    .eq("role", "client")

  if (error) {
    console.error("Error updating client user status:", error)
    return { error: error.message }
  }

  revalidatePath("/clients")
  return { success: true }
}

// =====================================================
// Plans CRUD
// =====================================================

export async function createPlan(data: {
  client_id: string
  year: number
  month: number
}) {
  const supabase = await createClient()

  // Check if current user is admin/manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || !["admin", "manager"].includes(currentMember.role)) {
    return { error: "Only admins and managers can create plans" }
  }

  const { data: plan, error } = await supabase
    .from("plans")
    .insert({
      client_id: data.client_id,
      year: data.year,
      month: data.month,
      status: "active",
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating plan:", error)
    return { error: error.message }
  }

  revalidateAll()
  return { data: plan }
}

export async function deletePlan(id: string) {
  const supabase = await createClient()

  // Check if current user is admin/manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || !["admin", "manager"].includes(currentMember.role)) {
    return { error: "Only admins and managers can delete plans" }
  }

  // Get all posts for this plan
  const { data: posts } = await supabase
    .from("posts")
    .select("id")
    .eq("plan_id", id)

  // Delete related data for each post
  if (posts && posts.length > 0) {
    const postIds = posts.map(p => p.id)
    
    // Delete comments, approvals, assets, post_platforms, post_variants
    await supabase.from("comments").delete().in("post_id", postIds)
    await supabase.from("approvals").delete().in("post_id", postIds)
    await supabase.from("assets").delete().in("post_id", postIds)
    await supabase.from("post_platforms").delete().in("post_id", postIds)
    await supabase.from("post_variants").delete().in("post_id", postIds)
    
    // Delete posts
    await supabase.from("posts").delete().in("id", postIds)
  }

  // Now delete the plan
  const { error } = await supabase
    .from("plans")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting plan:", error)
    return { error: error.message }
  }

  revalidateAll()
  return { success: true }
}

export async function getOrCreatePlan(clientId: string, year: number, month: number) {
  const supabase = await createClient()

  // Try to get existing plan
  const { data: existingPlan } = await supabase
    .from("plans")
    .select("*")
    .eq("client_id", clientId)
    .eq("year", year)
    .eq("month", month)
    .single()

  if (existingPlan) {
    return { data: existingPlan }
  }

  // Create new plan
  return createPlan({ client_id: clientId, year, month })
}

// =====================================================
// Assets CRUD
// =====================================================

export async function uploadAsset(
  postId: string,
  file: File,
  variantId?: string
) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Check if post is locked
  const { data: post } = await supabase
    .from("posts")
    .select("locked, client_id")
    .eq("id", postId)
    .single()

  if (!post) return { error: "Post not found" }

  // Get user role
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  const userRole = teamMember?.role || "client"

  // Check permissions
  if (post.locked && !["admin", "manager"].includes(userRole)) {
    return { error: "Cannot upload to locked post" }
  }

  if (userRole === "client") {
    return { error: "Clients cannot upload files" }
  }

  // Generate unique filename
  const fileExt = file.name.split(".").pop()
  const fileName = `${postId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("post-assets")
    .upload(fileName, file)

  if (uploadError) {
    console.error("Error uploading file:", uploadError)
    return { error: uploadError.message }
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("post-assets")
    .getPublicUrl(fileName)

  // Determine file type
  const mimeType = file.type
  let assetType: "image" | "video" | "file" = "file"
  if (mimeType.startsWith("image/")) assetType = "image"
  else if (mimeType.startsWith("video/")) assetType = "video"

  // Create asset record
  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .insert({
      post_id: postId,
      variant_id: variantId || null,
      type: assetType,
      url: urlData.publicUrl,
      name: file.name,
    })
    .select()
    .single()

  if (assetError) {
    console.error("Error creating asset record:", assetError)
    // Try to delete uploaded file
    await supabase.storage.from("post-assets").remove([fileName])
    return { error: assetError.message }
  }

  revalidateAll()
  return { data: asset }
}

export async function deleteAsset(assetId: string) {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Get asset info
  const { data: asset } = await supabase
    .from("assets")
    .select("*, post:posts(locked, client_id)")
    .eq("id", assetId)
    .single()

  if (!asset) return { error: "Asset not found" }

  // Get user role
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  const userRole = teamMember?.role || "client"

  // Check permissions
  if ((asset.post as any)?.locked && !["admin", "manager"].includes(userRole)) {
    return { error: "Cannot delete from locked post" }
  }

  if (!["admin", "manager", "writer", "designer"].includes(userRole)) {
    return { error: "Insufficient permissions" }
  }

  // Extract filename from URL
  const url = new URL(asset.url)
  const pathParts = url.pathname.split("/")
  const fileName = pathParts.slice(-2).join("/") // post_id/filename

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("post-assets")
    .remove([fileName])

  if (storageError) {
    console.error("Error deleting file from storage:", storageError)
  }

  // Delete asset record
  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("id", assetId)

  if (error) {
    console.error("Error deleting asset record:", error)
    return { error: error.message }
  }

  revalidateAll()
  return { success: true }
}

export async function getAssetsByPost(postId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching assets:", error)
    return { error: error.message }
  }

  return { data }
}

// =====================================================
// Team Member Clients - Get assigned clients
// =====================================================

export async function getTeamMemberClients(teamMemberId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("team_member_clients")
    .select(`
      id,
      client_id,
      created_at,
      clients (
        id,
        name,
        status
      )
    `)
    .eq("team_member_id", teamMemberId)

  if (error) {
    console.error("Error fetching team member clients:", error)
    return { error: error.message }
  }

  return { data }
}

export async function updateTeamMemberClients(teamMemberId: string, clientIds: string[]) {
  const supabase = await createClient()

  // Check if current user is admin/manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || !["admin", "manager"].includes(currentMember.role)) {
    return { error: "Only admins and managers can manage team member assignments" }
  }

  // Delete all existing assignments
  const { error: deleteError } = await supabase
    .from("team_member_clients")
    .delete()
    .eq("team_member_id", teamMemberId)

  if (deleteError) {
    console.error("Error deleting existing assignments:", deleteError)
    return { error: deleteError.message }
  }

  // Insert new assignments
  if (clientIds.length > 0) {
    const { error: insertError } = await supabase
      .from("team_member_clients")
      .insert(
        clientIds.map(clientId => ({
          team_member_id: teamMemberId,
          client_id: clientId,
        }))
      )

    if (insertError) {
      console.error("Error inserting new assignments:", insertError)
      return { error: insertError.message }
    }
  }

  revalidatePath("/team")
  return { success: true }
}

// =====================================================
// Share Links
// =====================================================

export async function createShareLink(data: {
  clientId: string
  year: number
  month: number
  password?: string
  expiresInDays?: number
}) {
  const supabase = await createClient()

  // Check if current user is admin/manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || !["admin", "manager"].includes(currentMember.role)) {
    return { error: "Only admins and managers can create share links" }
  }

  // Calculate expiration date if provided
  const expiresAt = data.expiresInDays 
    ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  // Upsert share link (create or update)
  const { data: shareLink, error } = await supabase
    .from("share_links")
    .upsert({
      client_id: data.clientId,
      year: data.year,
      month: data.month,
      password: data.password || null,
      is_active: true,
      expires_at: expiresAt,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'client_id,year,month'
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating share link:", error)
    return { error: error.message }
  }

  return { data: shareLink }
}

export async function getShareLink(clientId: string, year: number, month: number) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("share_links")
    .select("*")
    .eq("client_id", clientId)
    .eq("year", year)
    .eq("month", month)
    .eq("is_active", true)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching share link:", error)
    return { error: error.message }
  }

  return { data }
}

export async function revokeShareLink(linkId: string) {
  const supabase = await createClient()

  // Check if current user is admin/manager
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: currentMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!currentMember || !["admin", "manager"].includes(currentMember.role)) {
    return { error: "Only admins and managers can revoke share links" }
  }

  const { error } = await supabase
    .from("share_links")
    .update({ is_active: false })
    .eq("id", linkId)

  if (error) {
    console.error("Error revoking share link:", error)
    return { error: error.message }
  }

  return { success: true }
}

// =====================================================
// User Settings
// =====================================================

export async function getUserSettings() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching user settings:", error)
    return { error: error.message }
  }

  return { data }
}

export async function updateUserSettings(settings: {
  theme?: string
  language?: string
  email_notifications?: boolean
  push_notifications?: boolean
  notify_on_comment?: boolean
  notify_on_approval?: boolean
  notify_on_assignment?: boolean
  default_view?: string
  default_client_id?: string | null
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // Upsert settings
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({
      user_id: user.id,
      ...settings,
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single()

  if (error) {
    console.error("Error updating user settings:", error)
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { data }
}
