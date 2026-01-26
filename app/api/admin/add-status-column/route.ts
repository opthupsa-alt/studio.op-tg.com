import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST() {
  try {
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

    // First, let's try to update all existing records to have 'active' status
    // This will work if the column exists
    const { error: updateError } = await supabaseAdmin
      .from('team_members')
      .update({ status: 'active' })
      .is('status', null)

    if (updateError) {
      // Column doesn't exist - need to add it via SQL
      // Since we can't run DDL directly, we'll return instructions
      return NextResponse.json({
        success: false,
        message: "Column doesn't exist. Please run SQL manually.",
        sql: `ALTER TABLE team_members ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));`
      })
    }

    return NextResponse.json({ success: true, message: "Status column is ready" })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
