import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, full_name, client_id } = body

    if (!email || !password || !full_name || !client_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verify the requesting user is admin/manager
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: currentMember } = await supabase
      .from("team_members")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (!currentMember || !["admin", "manager"].includes(currentMember.role)) {
      return NextResponse.json(
        { error: "Only admins and managers can create client users" },
        { status: 403 }
      )
    }

    // Use Admin API to create user without email confirmation
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Create user with admin API - email is automatically confirmed
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        role: "client",
      },
    })

    if (authError) {
      console.error("Error creating auth user:", authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    // Create team member linked to auth user
    const { data: teamMember, error: memberError } = await supabaseAdmin
      .from("team_members")
      .insert({
        user_id: authData.user.id,
        email,
        full_name,
        role: "client",
        client_id,
        status: "active",
      })
      .select()
      .single()

    if (memberError) {
      // Rollback: delete auth user if team member creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      console.error("Error creating team member:", memberError)
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    return NextResponse.json({ data: teamMember })
  } catch (error) {
    console.error("Error in create-client-user:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
