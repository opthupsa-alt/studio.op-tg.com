import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://poouovsuyhnnrqtqeybq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvb3VvdnN1eWhubnJxdHFleWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzI5MDcsImV4cCI6MjA4NDk0ODkwN30.KuzvsWlJUa54DBAMnD2tQo1nfDsKDGiDLExZ-MQPcaA'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testLogin() {
  const email = 'admin@op-target.com'
  const password = '@opTarget20#30'
  
  console.log('🔐 Testing login...')
  console.log('📧 Email:', email)
  console.log('🔑 Password:', password)
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) {
    console.error('\n❌ Login failed!')
    console.error('Error:', error.message)
    console.error('Status:', error.status)
    console.error('Full error:', JSON.stringify(error, null, 2))
    return
  }
  
  console.log('\n✅ Login successful!')
  console.log('User ID:', data.user.id)
  console.log('Email:', data.user.email)
  console.log('Session:', data.session ? 'Created' : 'None')
}

testLogin()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err)
    process.exit(1)
  })
