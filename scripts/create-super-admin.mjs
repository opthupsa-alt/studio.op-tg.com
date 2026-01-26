import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://poouovsuyhnnrqtqeybq.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvb3VvdnN1eWhubnJxdHFleWJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3MjkwNywiZXhwIjoyMDg0OTQ4OTA3fQ.J71PHq82CNkQBg9DP4E_Mg3HCe-2v542oujY_qu3ToE'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createSuperAdmin() {
  const email = 'admin@op-target.com'
  const password = '@opTarget20#30'
  
  console.log('🔐 Creating Super Admin...')
  
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: 'Super Admin',
      role: 'admin',
      is_protected: true
    }
  })
  
  if (authError) {
    // Check if user already exists
    if (authError.message.includes('already been registered')) {
      console.log('⚠️ User already exists, updating...')
      
      // Get existing user
      const { data: users } = await supabase.auth.admin.listUsers()
      const existingUser = users?.users?.find(u => u.email === email)
      
      if (existingUser) {
        // Update password
        await supabase.auth.admin.updateUserById(existingUser.id, {
          password,
          user_metadata: {
            full_name: 'Super Admin',
            role: 'admin',
            is_protected: true
          }
        })
        console.log('✅ Password updated for existing user')
        
        // Create/update team member
        await createTeamMember(existingUser.id, email)
        return
      }
    }
    console.error('❌ Auth error:', authError.message)
    return
  }
  
  console.log('✅ Auth user created:', authData.user.id)
  
  // 2. Create team member
  await createTeamMember(authData.user.id, email)
}

async function createTeamMember(userId, email) {
  // Check if team member exists
  const { data: existing } = await supabase
    .from('team_members')
    .select('id')
    .eq('user_id', userId)
    .single()
  
  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('team_members')
      .update({
        role: 'admin',
        full_name: 'Super Admin',
        email: email,
        is_protected: true
      })
      .eq('id', existing.id)
    
    if (error) {
      console.error('❌ Error updating team member:', error.message)
    } else {
      console.log('✅ Team member updated')
    }
  } else {
    // Create new
    const { error } = await supabase
      .from('team_members')
      .insert({
        user_id: userId,
        role: 'admin',
        full_name: 'Super Admin',
        email: email,
        is_protected: true
      })
    
    if (error) {
      console.error('❌ Error creating team member:', error.message)
    } else {
      console.log('✅ Team member created')
    }
  }
}

createSuperAdmin()
  .then(() => {
    console.log('\n🎉 Super Admin setup complete!')
    console.log('📧 Email: admin@op-target.com')
    console.log('🔑 Password: @opTarget20#30')
    console.log('\n⚠️ This account is protected from deletion')
    process.exit(0)
  })
  .catch(err => {
    console.error('❌ Fatal error:', err)
    process.exit(1)
  })
