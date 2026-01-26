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

async function recreateShareLinksTable() {
  console.log('🔧 Recreating share_links table...')

  // Drop existing table
  console.log('Dropping existing table...')
  const { error: dropError } = await supabase
    .from('share_links')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

  if (dropError && !dropError.message.includes('does not exist')) {
    console.log('Note: Could not clear table:', dropError.message)
  }

  // Try to insert a test row with password to see current schema
  const testId = '00000000-0000-0000-0000-000000000001'
  const { error: insertError } = await supabase
    .from('share_links')
    .upsert({
      id: testId,
      client_id: '00000000-0000-0000-0000-000000000000',
      year: 2000,
      month: 1,
      password: 'test',
      is_active: false
    })

  if (insertError) {
    if (insertError.message.includes('password')) {
      console.log('❌ Column password does not exist in table.')
      console.log('')
      console.log('===== PLEASE RUN THIS SQL IN SUPABASE DASHBOARD =====')
      console.log('')
      console.log('-- First, drop the existing table')
      console.log('DROP TABLE IF EXISTS share_links;')
      console.log('')
      console.log('-- Then create it with all columns')
      console.log(`CREATE TABLE share_links (
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
);`)
      console.log('')
      console.log('-- Enable RLS')
      console.log('ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;')
      console.log('')
      console.log('-- Allow public read for active links')
      console.log(`CREATE POLICY "Anyone can read active share links" ON share_links FOR SELECT USING (is_active = true);`)
      console.log('')
      console.log('-- Allow authenticated users to manage')
      console.log(`CREATE POLICY "Authenticated users can manage share links" ON share_links FOR ALL TO authenticated USING (true) WITH CHECK (true);`)
      console.log('')
      console.log('=======================================================')
    } else if (insertError.message.includes('violates foreign key')) {
      console.log('✅ Table structure is correct! (foreign key error is expected for test data)')
      // Clean up test row
      await supabase.from('share_links').delete().eq('id', testId)
    } else {
      console.log('Error:', insertError.message)
    }
  } else {
    console.log('✅ Table has password column!')
    // Clean up test row
    await supabase.from('share_links').delete().eq('id', testId)
  }
}

recreateShareLinksTable()
