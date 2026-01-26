// Create admin user in Supabase Auth
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://poouovsuyhnnrqtqeybq.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvb3VvdnN1eWhubnJxdHFleWJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3MjkwNywiZXhwIjoyMDg0OTQ4OTA3fQ.J71PHq82CNkQBg9DP4E_Mg3HCe-2v542oujY_qu3ToE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  console.log('🔐 Creating admin user...\n')

  // Create user
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@example.com',
    password: 'Admin123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'أحمد محمد'
    }
  })

  if (error) {
    if (error.message.includes('already been registered')) {
      console.log('ℹ️ User already exists')
      
      // Get the user
      const { data: users } = await supabase.auth.admin.listUsers()
      const adminUser = users?.users?.find(u => u.email === 'admin@example.com')
      
      if (adminUser) {
        console.log('✅ Found existing user:', adminUser.id)
        
        // Link to team_members
        const { error: updateError } = await supabase
          .from('team_members')
          .update({ user_id: adminUser.id })
          .eq('email', 'admin@example.com')
        
        if (!updateError) {
          console.log('✅ Linked user to team_members')
        } else {
          console.log('⚠️ Could not link:', updateError.message)
        }
      }
    } else {
      console.log('❌ Error:', error.message)
    }
  } else {
    console.log('✅ User created:', data.user?.id)
    
    // Link to team_members
    if (data.user) {
      const { error: updateError } = await supabase
        .from('team_members')
        .update({ user_id: data.user.id })
        .eq('email', 'admin@example.com')
      
      if (!updateError) {
        console.log('✅ Linked user to team_members')
      }
    }
  }

  console.log('\n📋 Login credentials:')
  console.log('   Email: admin@example.com')
  console.log('   Password: Admin123!')
  console.log('\n🌐 Go to: http://localhost:3000/auth/login')
}

main().catch(console.error)
