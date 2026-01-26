import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://poouovsuyhnnrqtqeybq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvb3VvdnN1eWhubnJxdHFleWJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3MjkwNywiZXhwIjoyMDg0OTQ4OTA3fQ.J71PHq82CNkQBg9DP4E_Mg3HCe-2v542oujY_qu3ToE'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies for clients table...\n')

  // Drop existing policies and recreate them
  const sql = `
    -- Drop existing policies on clients table
    DROP POLICY IF EXISTS "clients_select_policy" ON clients;
    DROP POLICY IF EXISTS "clients_insert_policy" ON clients;
    DROP POLICY IF EXISTS "clients_update_policy" ON clients;
    DROP POLICY IF EXISTS "clients_delete_policy" ON clients;
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON clients;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON clients;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON clients;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON clients;
    DROP POLICY IF EXISTS "Authenticated users can read clients" ON clients;
    DROP POLICY IF EXISTS "Authenticated users can insert clients" ON clients;
    DROP POLICY IF EXISTS "Authenticated users can update clients" ON clients;
    DROP POLICY IF EXISTS "Authenticated users can delete clients" ON clients;

    -- Enable RLS on clients table
    ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

    -- Create new policies for clients table
    -- Allow authenticated users to read all clients
    CREATE POLICY "clients_read_all" ON clients
      FOR SELECT
      TO authenticated
      USING (true);

    -- Allow authenticated users to insert clients
    CREATE POLICY "clients_insert_all" ON clients
      FOR INSERT
      TO authenticated
      WITH CHECK (true);

    -- Allow authenticated users to update clients
    CREATE POLICY "clients_update_all" ON clients
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);

    -- Allow authenticated users to delete clients
    CREATE POLICY "clients_delete_all" ON clients
      FOR DELETE
      TO authenticated
      USING (true);

    -- Also fix posts table policies
    DROP POLICY IF EXISTS "posts_select_policy" ON posts;
    DROP POLICY IF EXISTS "posts_insert_policy" ON posts;
    DROP POLICY IF EXISTS "posts_update_policy" ON posts;
    DROP POLICY IF EXISTS "posts_delete_policy" ON posts;
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON posts;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON posts;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON posts;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON posts;

    -- Enable RLS on posts table
    ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

    -- Create new policies for posts table
    CREATE POLICY "posts_read_all" ON posts
      FOR SELECT
      TO authenticated
      USING (true);

    CREATE POLICY "posts_insert_all" ON posts
      FOR INSERT
      TO authenticated
      WITH CHECK (true);

    CREATE POLICY "posts_update_all" ON posts
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "posts_delete_all" ON posts
      FOR DELETE
      TO authenticated
      USING (true);

    -- Fix team_members table policies
    DROP POLICY IF EXISTS "team_members_select_policy" ON team_members;
    DROP POLICY IF EXISTS "team_members_insert_policy" ON team_members;
    DROP POLICY IF EXISTS "team_members_update_policy" ON team_members;
    DROP POLICY IF EXISTS "team_members_delete_policy" ON team_members;

    ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "team_members_read_all" ON team_members
      FOR SELECT
      TO authenticated
      USING (true);

    CREATE POLICY "team_members_insert_all" ON team_members
      FOR INSERT
      TO authenticated
      WITH CHECK (true);

    CREATE POLICY "team_members_update_all" ON team_members
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "team_members_delete_all" ON team_members
      FOR DELETE
      TO authenticated
      USING (true);
  `

  // Execute SQL using the REST API
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
  
  if (error) {
    console.log('⚠️ RPC method not available, trying direct approach...')
    
    // Try executing each statement separately
    const statements = sql.split(';').filter(s => s.trim())
    
    for (const statement of statements) {
      if (!statement.trim()) continue
      
      try {
        const { error: stmtError } = await supabase.from('_exec').select().limit(0)
        // This won't work, we need to use the SQL editor in Supabase Dashboard
      } catch (e) {
        // Expected to fail
      }
    }
    
    console.log('\n❌ Cannot execute SQL directly from script.')
    console.log('\n📋 Please run the following SQL in Supabase SQL Editor:')
    console.log('   https://supabase.com/dashboard/project/poouovsuyhnnrqtqeybq/sql/new\n')
    console.log('=' .repeat(60))
    console.log(sql)
    console.log('=' .repeat(60))
    return
  }
  
  console.log('✅ RLS policies fixed successfully!')
}

fixRLSPolicies()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
