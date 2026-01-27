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

    // Create comment_reads table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS comment_reads (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(comment_id, user_id)
        );
        
        ALTER TABLE comment_reads ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "comment_reads_select" ON comment_reads;
        DROP POLICY IF EXISTS "comment_reads_insert" ON comment_reads;
        DROP POLICY IF EXISTS "comment_reads_delete" ON comment_reads;
        
        CREATE POLICY "comment_reads_select" ON comment_reads
          FOR SELECT USING (user_id = auth.uid());
        
        CREATE POLICY "comment_reads_insert" ON comment_reads
          FOR INSERT WITH CHECK (user_id = auth.uid());
        
        CREATE POLICY "comment_reads_delete" ON comment_reads
          FOR DELETE USING (user_id = auth.uid());
        
        CREATE INDEX IF NOT EXISTS idx_comment_reads_user_id ON comment_reads(user_id);
        CREATE INDEX IF NOT EXISTS idx_comment_reads_comment_id ON comment_reads(comment_id);
      `
    })

    if (createError) {
      // Try simpler approach - just create the table
      const { error: simpleError } = await supabase
        .from('comment_reads')
        .select('id')
        .limit(1)

      if (simpleError && simpleError.code === '42P01') {
        // Table doesn't exist, return instruction
        return NextResponse.json({
          error: "Table doesn't exist. Please run the SQL script manually in Supabase.",
          script: "scripts/create-comment-reads.sql"
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: "comment_reads table is ready"
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
