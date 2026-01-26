import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://poouovsuyhnnrqtqeybq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvb3VvdnN1eWhubnJxdHFleWJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3MjkwNywiZXhwIjoyMDg0OTQ4OTA3fQ.J71PHq82CNkQBg9DP4E_Mg3HCe-2v542oujY_qu3ToE'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSchema() {
  console.log('🔍 Checking database schema...\n')

  // Get clients table structure
  console.log('📋 Clients table:')
  const { data: client } = await supabase.from('clients').select('*').limit(1)
  if (client && client[0]) {
    console.log('   Columns:', Object.keys(client[0]).join(', '))
  } else {
    // Try to get an empty row structure
    const { data: clientEmpty, error } = await supabase.from('clients').select('*').limit(0)
    console.log('   Empty table or error:', error?.message || 'No data')
  }

  // Get posts table structure
  console.log('\n📋 Posts table:')
  const { data: post } = await supabase.from('posts').select('*').limit(1)
  if (post && post[0]) {
    console.log('   Columns:', Object.keys(post[0]).join(', '))
  } else {
    console.log('   Empty table')
  }

  // Get team_members table structure
  console.log('\n📋 Team members table:')
  const { data: member } = await supabase.from('team_members').select('*').limit(1)
  if (member && member[0]) {
    console.log('   Columns:', Object.keys(member[0]).join(', '))
  }

  // Check what tables exist
  console.log('\n📋 Checking for content_plans or plans table...')
  
  const { data: plans1, error: e1 } = await supabase.from('content_plans').select('*').limit(1)
  console.log('   content_plans:', e1 ? `Error: ${e1.message}` : 'Exists')
  
  const { data: plans2, error: e2 } = await supabase.from('plans').select('*').limit(1)
  console.log('   plans:', e2 ? `Error: ${e2.message}` : 'Exists')

  // List all clients
  console.log('\n📋 All clients:')
  const { data: allClients } = await supabase.from('clients').select('*')
  if (allClients) {
    allClients.forEach(c => console.log(`   - ${c.id}: ${c.name}`))
  }
}

checkSchema()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
