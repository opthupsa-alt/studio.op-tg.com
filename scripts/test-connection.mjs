// Test Supabase connection
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://poouovsuyhnnrqtqeybq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvb3VvdnN1eWhubnJxdHFleWJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzI5MDcsImV4cCI6MjA4NDk0ODkwN30.KuzvsWlJUa54DBAMnD2tQo1nfDsKDGiDLExZ-MQPcaA'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function test() {
  console.log('Testing Supabase connection...\n')

  // Test platforms
  console.log('1. Testing platforms...')
  const { data: platforms, error: platformsError } = await supabase
    .from('platforms')
    .select('*')
  
  if (platformsError) {
    console.log('   ❌ Error:', platformsError.message, platformsError.code)
  } else {
    console.log('   ✅ Found', platforms.length, 'platforms')
  }

  // Test clients
  console.log('\n2. Testing clients...')
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
  
  if (clientsError) {
    console.log('   ❌ Error:', clientsError.message, clientsError.code)
  } else {
    console.log('   ✅ Found', clients.length, 'clients')
  }

  // Test plans
  console.log('\n3. Testing plans...')
  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('*')
  
  if (plansError) {
    console.log('   ❌ Error:', plansError.message, plansError.code)
  } else {
    console.log('   ✅ Found', plans.length, 'plans')
  }

  // Test posts
  console.log('\n4. Testing posts...')
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('*')
  
  if (postsError) {
    console.log('   ❌ Error:', postsError.message, postsError.code)
  } else {
    console.log('   ✅ Found', posts.length, 'posts')
  }

  console.log('\n✅ Test complete!')
}

test().catch(console.error)
