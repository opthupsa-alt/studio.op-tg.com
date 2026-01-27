import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addClientVisibilityColumns() {
  console.log('Adding client visibility columns to posts table...')

  // Add visible_to_client column
  const { error: error1 } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE posts ADD COLUMN IF NOT EXISTS visible_to_client BOOLEAN DEFAULT false;`
  }).catch(() => ({ error: null }))

  // Add awaiting_client_approval column
  const { error: error2 } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE posts ADD COLUMN IF NOT EXISTS awaiting_client_approval BOOLEAN DEFAULT false;`
  }).catch(() => ({ error: null }))

  // Update existing client_review posts
  const { error: error3 } = await supabase
    .from('posts')
    .update({ visible_to_client: true, awaiting_client_approval: true })
    .eq('status', 'client_review')

  if (error3) {
    console.log('Note: Could not update client_review posts (columns may not exist yet)')
  } else {
    console.log('Updated client_review posts')
  }

  // Update approved/scheduled/posted posts
  const { error: error4 } = await supabase
    .from('posts')
    .update({ visible_to_client: true })
    .in('status', ['approved', 'scheduled', 'posted'])

  if (error4) {
    console.log('Note: Could not update approved posts (columns may not exist yet)')
  } else {
    console.log('Updated approved/scheduled/posted posts')
  }

  console.log('Done! Please run the SQL script in Supabase dashboard if columns were not added.')
  console.log('SQL file: scripts/add-client-visibility-columns.sql')
}

addClientVisibilityColumns()
