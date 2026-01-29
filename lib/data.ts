import { createClient } from "@/lib/supabase/server"
import type { Post, Platform, Client, Plan, TeamMember } from "@/lib/types"

export async function getPlatforms(): Promise<Platform[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("platforms")
    .select("*")
    .order("name")

  if (error) {
    console.error("Error fetching platforms:", error)
    return []
  }

  return data || []
}

export async function getClients(): Promise<Client[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("status", "active")
    .order("name")

  if (error) {
    console.error("Error fetching clients:", error)
    return []
  }

  return data || []
}

export async function getPlans(): Promise<Plan[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("plans")
    .select(`
      *,
      client:clients(*)
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching plans:", error)
    return []
  }

  return data || []
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getPosts(options?: {
  page?: number
  pageSize?: number
  clientId?: string
  status?: string
}): Promise<Post[]> {
  const supabase = await createClient()
  const { page = 1, pageSize = 100, clientId, status } = options || {}
  
  // Build query - simplified for performance
  let query = supabase
    .from("posts")
    .select(`
      *,
      client:clients(*),
      post_platforms(
        platform:platforms(*)
      ),
      assets(*)
    `)
  
  // Apply filters
  if (clientId) {
    query = query.eq("client_id", clientId)
  }
  if (status) {
    query = query.eq("status", status)
  }
  
  // Apply pagination and ordering
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  
  const { data, error } = await query
    .order("publish_date", { ascending: true })
    .range(from, to)

  if (error) {
    console.error("Error fetching posts:", error)
    return []
  }

  // Transform the data to match our types
  return (data || []).map((post) => ({
    ...post,
    platforms: post.post_platforms?.map((pp: any) => pp.platform).filter(Boolean) || [],
    assets: post.assets || [],
  }))
}

export async function getPostsPaginated(options?: {
  page?: number
  pageSize?: number
  clientId?: string
  status?: string
}): Promise<PaginatedResult<Post>> {
  const supabase = await createClient()
  const { page = 1, pageSize = 50, clientId, status } = options || {}
  
  // Get total count first
  let countQuery = supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
  
  if (clientId) {
    countQuery = countQuery.eq("client_id", clientId)
  }
  if (status) {
    countQuery = countQuery.eq("status", status)
  }
  
  const { count } = await countQuery
  const total = count || 0
  const totalPages = Math.ceil(total / pageSize)
  
  // Get paginated data
  const posts = await getPosts({ page, pageSize, clientId, status })
  
  return {
    data: posts,
    total,
    page,
    pageSize,
    totalPages,
  }
}

export async function getPostById(id: string): Promise<Post | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      client:clients(*),
      post_platforms(
        platform:platforms(*)
      ),
      variants:post_variants(*),
      comments(*),
      approvals(*),
      assets(*)
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching post:", error)
    return null
  }

  return {
    ...data,
    platforms: data.post_platforms?.map((pp: any) => pp.platform).filter(Boolean) || [],
    assets: data.assets || [],
  }
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("full_name")

  if (error) {
    console.error("Error fetching team members:", error)
    return []
  }

  return data || []
}

export async function getTeamMemberClients(): Promise<{ id: string; team_member_id: string; client_id: string }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("team_member_clients")
    .select("id, team_member_id, client_id")

  if (error) {
    console.error("Error fetching team member clients:", error)
    return []
  }

  return data || []
}
