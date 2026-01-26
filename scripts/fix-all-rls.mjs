import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://poouovsuyhnnrqtqeybq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvb3VvdnN1eWhubnJxdHFleWJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3MjkwNywiZXhwIjoyMDg0OTQ4OTA3fQ.J71PHq82CNkQBg9DP4E_Mg3HCe-2v542oujY_qu3ToE'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testDatabaseAccess() {
  console.log('🔍 Testing database access with service role key...\n')

  // Test clients table
  console.log('📋 Testing clients table...')
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('*')
    .limit(5)
  
  if (clientsError) {
    console.log('❌ Clients error:', clientsError.message)
  } else {
    console.log('✅ Clients accessible. Count:', clients.length)
  }

  // Test posts table
  console.log('\n📋 Testing posts table...')
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('*')
    .limit(5)
  
  if (postsError) {
    console.log('❌ Posts error:', postsError.message)
  } else {
    console.log('✅ Posts accessible. Count:', posts.length)
  }

  // Test team_members table
  console.log('\n📋 Testing team_members table...')
  const { data: members, error: membersError } = await supabase
    .from('team_members')
    .select('*')
    .limit(5)
  
  if (membersError) {
    console.log('❌ Team members error:', membersError.message)
  } else {
    console.log('✅ Team members accessible. Count:', members.length)
  }

  // Test content_plans table
  console.log('\n📋 Testing content_plans table...')
  const { data: plans, error: plansError } = await supabase
    .from('content_plans')
    .select('*')
    .limit(5)
  
  if (plansError) {
    console.log('❌ Content plans error:', plansError.message)
  } else {
    console.log('✅ Content plans accessible. Count:', plans.length)
  }

  // Try to insert a test client
  console.log('\n🧪 Testing client insert with service role...')
  const testClient = {
    name: 'Test Client ' + Date.now(),
    brand_color: '#3b82f6'
  }
  
  const { data: newClient, error: insertError } = await supabase
    .from('clients')
    .insert(testClient)
    .select()
    .single()
  
  if (insertError) {
    console.log('❌ Insert error:', insertError.message)
  } else {
    console.log('✅ Client inserted successfully:', newClient.id)
    
    // Delete the test client
    await supabase.from('clients').delete().eq('id', newClient.id)
    console.log('🗑️ Test client deleted')
  }

  // Check RLS status
  console.log('\n📊 Checking table info...')
  
  // Get all policies
  const { data: policies, error: policiesError } = await supabase
    .rpc('get_policies')
  
  if (policiesError) {
    console.log('⚠️ Cannot get policies via RPC')
  } else {
    console.log('Policies:', policies)
  }
}

async function createTestData() {
  console.log('\n🔧 Creating test data...\n')

  // Create a test client
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      name: 'عميل تجريبي',
      brand_color: '#3b82f6'
    })
    .select()
    .single()

  if (clientError) {
    console.log('❌ Error creating client:', clientError.message)
    return
  }
  
  console.log('✅ Client created:', client.id, client.name)

  // Create a content plan
  const { data: plan, error: planError } = await supabase
    .from('content_plans')
    .insert({
      client_id: client.id,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      status: 'active'
    })
    .select()
    .single()

  if (planError) {
    console.log('❌ Error creating plan:', planError.message)
  } else {
    console.log('✅ Content plan created:', plan.id)
  }

  // Create a test post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({
      client_id: client.id,
      content_plan_id: plan?.id,
      title: 'منشور تجريبي',
      content: 'هذا محتوى تجريبي',
      post_type: 'post',
      status: 'draft',
      scheduled_date: new Date().toISOString().split('T')[0]
    })
    .select()
    .single()

  if (postError) {
    console.log('❌ Error creating post:', postError.message)
  } else {
    console.log('✅ Post created:', post.id)
  }

  console.log('\n🎉 Test data created successfully!')
  console.log('   Client ID:', client.id)
  console.log('   Plan ID:', plan?.id)
  console.log('   Post ID:', post?.id)
}

async function main() {
  await testDatabaseAccess()
  
  console.log('\n' + '='.repeat(50))
  console.log('Do you want to create test data? Running...')
  console.log('='.repeat(50) + '\n')
  
  await createTestData()
}

main()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch(err => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
