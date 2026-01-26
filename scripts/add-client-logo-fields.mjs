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

async function addClientLogoFields() {
  console.log('🔧 Adding logo_url and icon_url columns to clients table...')

  // Test if columns exist by selecting them
  const { data, error } = await supabase
    .from('clients')
    .select('logo_url, icon_url')
    .limit(1)

  if (error && error.message.includes('logo_url')) {
    console.log('❌ Columns do not exist.')
    console.log('')
    console.log('===== PLEASE RUN THIS SQL IN SUPABASE DASHBOARD =====')
    console.log('')
    console.log('ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url TEXT;')
    console.log('ALTER TABLE clients ADD COLUMN IF NOT EXISTS icon_url TEXT;')
    console.log('')
    console.log('=======================================================')
  } else {
    console.log('✅ Columns already exist or were added successfully!')
  }
}

addClientLogoFields()
