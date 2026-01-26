import { createClient } from '@supabase/supabase-js'
import pg from 'pg'

const { Client } = pg

// Direct database connection
const connectionString = 'postgres://postgres.poouovsuyhnnrqtqeybq:Jn0wcmwIOtOenXhk@aws-1-us-east-1.pooler.supabase.com:6543/postgres'

async function executeSQL() {
  console.log('🔧 Connecting to database directly...\n')
  
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    // Fix RLS for clients table
    console.log('📋 Fixing clients table RLS...')
    await client.query(`
      DROP POLICY IF EXISTS "clients_select_policy" ON clients;
      DROP POLICY IF EXISTS "clients_insert_policy" ON clients;
      DROP POLICY IF EXISTS "clients_update_policy" ON clients;
      DROP POLICY IF EXISTS "clients_delete_policy" ON clients;
      DROP POLICY IF EXISTS "clients_read_all" ON clients;
      DROP POLICY IF EXISTS "clients_insert_all" ON clients;
      DROP POLICY IF EXISTS "clients_update_all" ON clients;
      DROP POLICY IF EXISTS "clients_delete_all" ON clients;
    `)
    
    await client.query(`ALTER TABLE clients ENABLE ROW LEVEL SECURITY;`)
    await client.query(`CREATE POLICY "clients_read_all" ON clients FOR SELECT TO authenticated USING (true);`)
    await client.query(`CREATE POLICY "clients_insert_all" ON clients FOR INSERT TO authenticated WITH CHECK (true);`)
    await client.query(`CREATE POLICY "clients_update_all" ON clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);`)
    await client.query(`CREATE POLICY "clients_delete_all" ON clients FOR DELETE TO authenticated USING (true);`)
    console.log('✅ Clients RLS fixed')

    // Fix RLS for posts table
    console.log('\n📋 Fixing posts table RLS...')
    await client.query(`
      DROP POLICY IF EXISTS "posts_select_policy" ON posts;
      DROP POLICY IF EXISTS "posts_insert_policy" ON posts;
      DROP POLICY IF EXISTS "posts_update_policy" ON posts;
      DROP POLICY IF EXISTS "posts_delete_policy" ON posts;
      DROP POLICY IF EXISTS "posts_read_all" ON posts;
      DROP POLICY IF EXISTS "posts_insert_all" ON posts;
      DROP POLICY IF EXISTS "posts_update_all" ON posts;
      DROP POLICY IF EXISTS "posts_delete_all" ON posts;
    `)
    
    await client.query(`ALTER TABLE posts ENABLE ROW LEVEL SECURITY;`)
    await client.query(`CREATE POLICY "posts_read_all" ON posts FOR SELECT TO authenticated USING (true);`)
    await client.query(`CREATE POLICY "posts_insert_all" ON posts FOR INSERT TO authenticated WITH CHECK (true);`)
    await client.query(`CREATE POLICY "posts_update_all" ON posts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);`)
    await client.query(`CREATE POLICY "posts_delete_all" ON posts FOR DELETE TO authenticated USING (true);`)
    console.log('✅ Posts RLS fixed')

    // Fix RLS for plans table
    console.log('\n📋 Fixing plans table RLS...')
    await client.query(`
      DROP POLICY IF EXISTS "plans_select_policy" ON plans;
      DROP POLICY IF EXISTS "plans_insert_policy" ON plans;
      DROP POLICY IF EXISTS "plans_update_policy" ON plans;
      DROP POLICY IF EXISTS "plans_delete_policy" ON plans;
      DROP POLICY IF EXISTS "plans_read_all" ON plans;
      DROP POLICY IF EXISTS "plans_insert_all" ON plans;
      DROP POLICY IF EXISTS "plans_update_all" ON plans;
      DROP POLICY IF EXISTS "plans_delete_all" ON plans;
    `)
    
    await client.query(`ALTER TABLE plans ENABLE ROW LEVEL SECURITY;`)
    await client.query(`CREATE POLICY "plans_read_all" ON plans FOR SELECT TO authenticated USING (true);`)
    await client.query(`CREATE POLICY "plans_insert_all" ON plans FOR INSERT TO authenticated WITH CHECK (true);`)
    await client.query(`CREATE POLICY "plans_update_all" ON plans FOR UPDATE TO authenticated USING (true) WITH CHECK (true);`)
    await client.query(`CREATE POLICY "plans_delete_all" ON plans FOR DELETE TO authenticated USING (true);`)
    console.log('✅ Plans RLS fixed')

    // Fix RLS for team_members table
    console.log('\n📋 Fixing team_members table RLS...')
    await client.query(`
      DROP POLICY IF EXISTS "team_members_select_policy" ON team_members;
      DROP POLICY IF EXISTS "team_members_insert_policy" ON team_members;
      DROP POLICY IF EXISTS "team_members_update_policy" ON team_members;
      DROP POLICY IF EXISTS "team_members_delete_policy" ON team_members;
      DROP POLICY IF EXISTS "team_members_read_all" ON team_members;
      DROP POLICY IF EXISTS "team_members_insert_all" ON team_members;
      DROP POLICY IF EXISTS "team_members_update_all" ON team_members;
      DROP POLICY IF EXISTS "team_members_delete_all" ON team_members;
    `)
    
    await client.query(`ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;`)
    await client.query(`CREATE POLICY "team_members_read_all" ON team_members FOR SELECT TO authenticated USING (true);`)
    await client.query(`CREATE POLICY "team_members_insert_all" ON team_members FOR INSERT TO authenticated WITH CHECK (true);`)
    await client.query(`CREATE POLICY "team_members_update_all" ON team_members FOR UPDATE TO authenticated USING (true) WITH CHECK (true);`)
    await client.query(`CREATE POLICY "team_members_delete_all" ON team_members FOR DELETE TO authenticated USING (true);`)
    console.log('✅ Team members RLS fixed')

    console.log('\n🎉 All RLS policies fixed successfully!')

  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    await client.end()
  }
}

executeSQL()
