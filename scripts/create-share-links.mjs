import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Read .env.local manually
const envContent = readFileSync('.env.local', 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  if (line.startsWith('#') || !line.trim()) return
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    let value = valueParts.join('=').trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    envVars[key.trim()] = value
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createShareLinksTable() {
  console.log('🔧 Creating share_links table...')

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS share_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
        password TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        expires_at TIMESTAMPTZ,
        created_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(client_id, year, month)
      );
    `
  })

  if (error) {
    // Try direct SQL if RPC doesn't exist
    console.log('RPC not available, trying direct approach...')
    
    // Check if table exists
    const { data: tables } = await supabase
      .from('share_links')
      .select('id')
      .limit(1)
    
    if (tables !== null) {
      console.log('✅ share_links table already exists!')
      return
    }
    
    console.log('⚠️ Table does not exist. Please run the SQL in create-share-links-table.sql manually in Supabase Dashboard.')
    return
  }

  console.log('✅ share_links table created successfully!')
}

createShareLinksTable()
