import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addStatusColumn() {
  console.log('Adding status column to team_members table...')
  
  // Use raw SQL via rpc or direct query
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      ALTER TABLE team_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
      UPDATE team_members SET status = 'active' WHERE status IS NULL;
    `
  })

  if (error) {
    // Try alternative approach - update existing records first
    console.log('RPC not available, trying direct approach...')
    
    // Check if column exists by trying to query it
    const { data, error: selectError } = await supabase
      .from('team_members')
      .select('id')
      .limit(1)
    
    if (selectError) {
      console.error('Error accessing team_members:', selectError)
      return
    }
    
    console.log('Table accessible. Please run the following SQL in Supabase Dashboard:')
    console.log(`
--------------------------------------------------
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'inactive'));

UPDATE team_members SET status = 'active' WHERE status IS NULL;
--------------------------------------------------
    `)
    return
  }

  console.log('✅ Status column added successfully!')
}

addStatusColumn()
