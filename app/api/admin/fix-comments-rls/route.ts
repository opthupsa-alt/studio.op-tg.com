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

    // Execute RLS fix using raw SQL
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop existing policies
        DROP POLICY IF EXISTS "comments_select" ON comments;
        DROP POLICY IF EXISTS "comments_insert" ON comments;
        DROP POLICY IF EXISTS "comments_update" ON comments;
        DROP POLICY IF EXISTS "comments_delete" ON comments;
        DROP POLICY IF EXISTS "comments_all" ON comments;
      `
    })

    // Create new SELECT policy
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "comments_select" ON comments
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM posts p 
            WHERE p.id = comments.post_id
            AND (
              EXISTS (
                SELECT 1 FROM team_members tm 
                WHERE tm.user_id = auth.uid() 
                AND tm.role IN ('admin', 'manager')
              )
              OR EXISTS (
                SELECT 1 FROM team_members tm 
                WHERE tm.user_id = auth.uid() 
                AND tm.role = 'client'
                AND tm.client_id = p.client_id
              )
            )
          )
          AND (
            scope = 'client'
            OR EXISTS (
              SELECT 1 FROM team_members tm 
              WHERE tm.user_id = auth.uid() 
              AND tm.role != 'client'
            )
          )
        );
      `
    })

    // Create new INSERT policy
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "comments_insert" ON comments
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM posts p 
            WHERE p.id = comments.post_id
            AND (
              EXISTS (
                SELECT 1 FROM team_members tm 
                WHERE tm.user_id = auth.uid() 
                AND tm.role IN ('admin', 'manager')
              )
              OR EXISTS (
                SELECT 1 FROM team_members tm 
                WHERE tm.user_id = auth.uid() 
                AND tm.role = 'client'
                AND tm.client_id = p.client_id
              )
            )
          )
        );
      `
    })

    if (error1 || error2 || error3) {
      return NextResponse.json({
        error: "Error updating RLS policies",
        details: { error1, error2, error3 }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Comments RLS policies updated successfully"
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
