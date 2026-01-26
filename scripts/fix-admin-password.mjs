import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://poouovsuyhnnrqtqeybq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvb3VvdnN1eWhubnJxdHFleWJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3MjkwNywiZXhwIjoyMDg0OTQ4OTA3fQ.J71PHq82CNkQBg9DP4E_Mg3HCe-2v542oujY_qu3ToE'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixAdminPassword() {
  const email = 'admin@op-target.com'
  const password = '@opTarget20#30'
  
  console.log('🔍 Looking for user:', email)
  
  // Get all users
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error('❌ Error listing users:', listError.message)
    return
  }
  
  console.log('📋 Total users found:', users.users.length)
  
  // Find the user
  const user = users.users.find(u => u.email === email)
  
  if (!user) {
    console.log('❌ User not found with email:', email)
    console.log('📋 Available users:')
    users.users.forEach(u => console.log('  -', u.email))
    return
  }
  
  console.log('✅ User found:', user.id)
  console.log('   Email:', user.email)
  console.log('   Confirmed:', user.email_confirmed_at ? 'Yes' : 'No')
  
  // Update password
  console.log('\n🔐 Updating password...')
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password: password,
    email_confirm: true
  })
  
  if (error) {
    console.error('❌ Error updating password:', error.message)
    return
  }
  
  console.log('✅ Password updated successfully!')
  
  // Verify team member exists
  console.log('\n🔍 Checking team member...')
  const { data: teamMember, error: tmError } = await supabase
    .from('team_members')
    .select('*')
    .eq('user_id', user.id)
    .single()
  
  if (tmError) {
    console.log('⚠️ No team member found, creating...')
    const { error: createError } = await supabase
      .from('team_members')
      .insert({
        user_id: user.id,
        email: email,
        full_name: 'Super Admin',
        role: 'admin',
        is_protected: true
      })
    
    if (createError) {
      console.error('❌ Error creating team member:', createError.message)
    } else {
      console.log('✅ Team member created')
    }
  } else {
    console.log('✅ Team member exists:', teamMember.full_name)
  }
  
  console.log('\n🎉 Done!')
  console.log('📧 Email:', email)
  console.log('🔑 Password:', password)
}

fixAdminPassword()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err)
    process.exit(1)
  })
