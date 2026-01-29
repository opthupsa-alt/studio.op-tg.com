// Execute SQL directly via Supabase REST API
const SUPABASE_URL = "https://poouovsuyhnnrqtqeybq.supabase.co"
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvb3VvdnN1eWhubnJxdHFleWJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3MjkwNywiZXhwIjoyMDg0OTQ4OTA3fQ.J71PHq82CNkQBg9DP4E_Mg3HCe-2v542oujY_qu3ToE"

async function executeSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql_query: sql })
  })
  
  if (!response.ok) {
    const text = await response.text()
    return { error: text }
  }
  
  return { success: true }
}

async function main() {
  console.log('Executing Storage RLS SQL...\n')
  
  // SQL statements to execute
  const statements = [
    // Drop existing policies
    `DROP POLICY IF EXISTS "post_assets_select" ON storage.objects`,
    `DROP POLICY IF EXISTS "post_assets_insert" ON storage.objects`,
    `DROP POLICY IF EXISTS "post_assets_update" ON storage.objects`,
    `DROP POLICY IF EXISTS "post_assets_delete" ON storage.objects`,
    `DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects`,
    `DROP POLICY IF EXISTS "Authenticated users can read" ON storage.objects`,
    `DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects`,
    `DROP POLICY IF EXISTS "Users can upload post assets" ON storage.objects`,
    `DROP POLICY IF EXISTS "Users can view post assets" ON storage.objects`,
    `DROP POLICY IF EXISTS "Users can delete post assets" ON storage.objects`,
    
    // SELECT policy
    `CREATE POLICY "post_assets_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'post-assets')`,
    
    // INSERT policy - allow non-client users
    `CREATE POLICY "post_assets_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-assets' AND auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.team_members WHERE user_id = auth.uid() AND role = 'client'))`,
    
    // UPDATE policy  
    `CREATE POLICY "post_assets_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'post-assets' AND auth.uid() IS NOT NULL)`,
    
    // DELETE policy - admin/manager only
    `CREATE POLICY "post_assets_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'post-assets' AND EXISTS (SELECT 1 FROM public.team_members WHERE user_id = auth.uid() AND role IN ('admin', 'manager')))`,
  ]
  
  for (const sql of statements) {
    const result = await executeSQL(sql)
    const shortSql = sql.substring(0, 60)
    if (result.error) {
      console.log(`⚠️  ${shortSql}...`)
      console.log(`   Note: ${result.error.substring(0, 100)}`)
    } else {
      console.log(`✅ ${shortSql}...`)
    }
  }
  
  console.log('\n✅ Done! If policies were not created, run the SQL manually in Supabase Dashboard.')
}

main()
