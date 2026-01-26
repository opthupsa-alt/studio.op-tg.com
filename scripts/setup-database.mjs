// Setup Database Script
// This script creates tables and seeds data in Supabase

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://poouovsuyhnnrqtqeybq.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvb3VvdnN1eWhubnJxdHFleWJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3MjkwNywiZXhwIjoyMDg0OTQ4OTA3fQ.J71PHq82CNkQBg9DP4E_Mg3HCe-2v542oujY_qu3ToE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSQL(sql, description) {
  console.log(`\n📦 ${description}...`)
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
  
  if (error) {
    // Try direct query approach
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql_query: sql })
    })
    
    if (!response.ok) {
      console.log(`⚠️ RPC not available, will use direct table operations`)
      return false
    }
  }
  
  console.log(`✅ ${description} - Done!`)
  return true
}

async function setupPlatforms() {
  console.log('\n📦 Setting up platforms...')
  
  const platforms = [
    { key: 'instagram', name: 'Instagram', icon: 'instagram' },
    { key: 'facebook', name: 'Facebook', icon: 'facebook' },
    { key: 'x', name: 'X (Twitter)', icon: 'twitter' },
    { key: 'tiktok', name: 'TikTok', icon: 'tiktok' },
    { key: 'linkedin', name: 'LinkedIn', icon: 'linkedin' },
    { key: 'snapchat', name: 'Snapchat', icon: 'snapchat' },
    { key: 'youtube', name: 'YouTube', icon: 'youtube' },
  ]
  
  const { error } = await supabase.from('platforms').upsert(platforms, { onConflict: 'key' })
  
  if (error) {
    console.log('❌ Error setting up platforms:', error.message)
    return false
  }
  
  console.log('✅ Platforms created!')
  return true
}

async function setupClients() {
  console.log('\n📦 Setting up clients...')
  
  const clients = [
    { id: 'c1000000-0000-0000-0000-000000000001', name: 'حلول التقنية', status: 'active', brand_primary_color: '#3B82F6', timezone: 'Asia/Riyadh' },
    { id: 'c1000000-0000-0000-0000-000000000002', name: 'الأغذية الخضراء', status: 'active', brand_primary_color: '#22C55E', timezone: 'Asia/Riyadh' },
    { id: 'c1000000-0000-0000-0000-000000000003', name: 'بيت الأزياء', status: 'active', brand_primary_color: '#EC4899', timezone: 'Asia/Riyadh' },
    { id: 'c1000000-0000-0000-0000-000000000004', name: 'أوتو موتورز', status: 'active', brand_primary_color: '#F59E0B', timezone: 'Asia/Riyadh' },
    { id: 'c1000000-0000-0000-0000-000000000005', name: 'صحة بلس', status: 'active', brand_primary_color: '#06B6D4', timezone: 'Asia/Riyadh' },
  ]
  
  const { error } = await supabase.from('clients').upsert(clients, { onConflict: 'id' })
  
  if (error) {
    console.log('❌ Error setting up clients:', error.message)
    return false
  }
  
  console.log('✅ Clients created!')
  return true
}

async function setupPlans() {
  console.log('\n📦 Setting up plans...')
  
  const plans = [
    { id: '11000000-0000-0000-0000-000000000001', client_id: 'c1000000-0000-0000-0000-000000000001', year: 2026, month: 1, status: 'active' },
    { id: '11000000-0000-0000-0000-000000000002', client_id: 'c1000000-0000-0000-0000-000000000002', year: 2026, month: 1, status: 'active' },
    { id: '11000000-0000-0000-0000-000000000003', client_id: 'c1000000-0000-0000-0000-000000000003', year: 2026, month: 1, status: 'active' },
  ]
  
  const { error } = await supabase.from('plans').upsert(plans, { onConflict: 'id' })
  
  if (error) {
    console.log('❌ Error setting up plans:', error.message)
    return false
  }
  
  console.log('✅ Plans created!')
  return true
}

async function setupPosts() {
  console.log('\n📦 Setting up posts...')
  
  const posts = [
    { id: '22000000-0000-0000-0000-000000000001', plan_id: '11000000-0000-0000-0000-000000000001', client_id: 'c1000000-0000-0000-0000-000000000001', publish_date: '2026-01-27', title: 'إطلاق منتجنا الجديد!', description: 'نحن متحمسون للإعلان عن إطلاق منتجنا التقني الجديد الذي سيغير طريقة عملك', post_type: 'post', main_goal: 'awareness', status: 'scheduled', position: 1 },
    { id: '22000000-0000-0000-0000-000000000002', plan_id: '11000000-0000-0000-0000-000000000001', client_id: 'c1000000-0000-0000-0000-000000000001', publish_date: '2026-01-28', title: 'مميزات المنتج الجديد', description: 'تعرف على أهم 5 مميزات تجعل منتجنا الخيار الأفضل لك', post_type: 'carousel', main_goal: 'engagement', status: 'approved', position: 2 },
    { id: '22000000-0000-0000-0000-000000000003', plan_id: '11000000-0000-0000-0000-000000000001', client_id: 'c1000000-0000-0000-0000-000000000001', publish_date: '2026-01-29', title: 'شهادات العملاء', description: 'استمع لتجارب عملائنا الحقيقية مع المنتج', post_type: 'video', main_goal: 'leads', status: 'client_review', position: 3 },
    { id: '22000000-0000-0000-0000-000000000004', plan_id: '11000000-0000-0000-0000-000000000002', client_id: 'c1000000-0000-0000-0000-000000000002', publish_date: '2026-01-25', title: 'وصفة اليوم: سلطة صحية', description: 'وصفة سهلة وسريعة لسلطة صحية ولذيذة بمكونات طبيعية 100%', post_type: 'reel', main_goal: 'engagement', status: 'posted', position: 1 },
    { id: '22000000-0000-0000-0000-000000000005', plan_id: '11000000-0000-0000-0000-000000000002', client_id: 'c1000000-0000-0000-0000-000000000002', publish_date: '2026-01-28', title: 'نصائح غذائية للشتاء', description: 'أهم النصائح للحفاظ على صحتك في فصل الشتاء', post_type: 'carousel', main_goal: 'awareness', status: 'scheduled', position: 2 },
    { id: '22000000-0000-0000-0000-000000000006', plan_id: '11000000-0000-0000-0000-000000000003', client_id: 'c1000000-0000-0000-0000-000000000003', publish_date: '2026-01-26', title: 'تخفيضات حتى 50%', description: 'لا تفوتوا الفرصة! تخفيضات كبرى على جميع المنتجات لفترة محدودة', post_type: 'story', main_goal: 'sales', status: 'scheduled', position: 1 },
    { id: '22000000-0000-0000-0000-000000000007', plan_id: '11000000-0000-0000-0000-000000000003', client_id: 'c1000000-0000-0000-0000-000000000003', publish_date: '2026-01-27', title: 'موضة 2026', description: 'اكتشف أحدث صيحات الموضة لعام 2026', post_type: 'reel', main_goal: 'awareness', status: 'approved', position: 2 },
    { id: '22000000-0000-0000-0000-000000000008', plan_id: '11000000-0000-0000-0000-000000000001', client_id: 'c1000000-0000-0000-0000-000000000001', publish_date: '2026-01-30', title: 'خلف الكواليس', description: 'شاهد كيف نصنع منتجاتنا بأعلى معايير الجودة', post_type: 'video', main_goal: 'engagement', status: 'design', position: 4 },
    { id: '22000000-0000-0000-0000-000000000009', plan_id: '11000000-0000-0000-0000-000000000002', client_id: 'c1000000-0000-0000-0000-000000000002', publish_date: '2026-01-30', title: 'سؤال وجواب', description: 'أجوبة على أكثر الأسئلة شيوعاً من متابعينا', post_type: 'story', main_goal: 'engagement', status: 'idea', position: 3 },
    { id: '22000000-0000-0000-0000-000000000010', plan_id: '11000000-0000-0000-0000-000000000003', client_id: 'c1000000-0000-0000-0000-000000000003', publish_date: '2026-01-28', title: 'تنسيقات الشتاء', description: 'أفكار تنسيقات شتوية أنيقة ومريحة', post_type: 'carousel', main_goal: 'engagement', status: 'draft', position: 3 },
  ]
  
  const { error } = await supabase.from('posts').upsert(posts, { onConflict: 'id' })
  
  if (error) {
    console.log('❌ Error setting up posts:', error.message)
    return false
  }
  
  console.log('✅ Posts created!')
  return true
}

async function setupTeamMembers() {
  console.log('\n📦 Setting up team members...')
  
  const teamMembers = [
    { id: '00000000-0000-0000-0000-000000000001', full_name: 'أحمد محمد', email: 'admin@example.com', role: 'admin' },
    { id: '00000000-0000-0000-0000-000000000002', full_name: 'سارة أحمد', email: 'sara@example.com', role: 'manager' },
    { id: '00000000-0000-0000-0000-000000000003', full_name: 'محمد علي', email: 'mohamed@example.com', role: 'writer' },
    { id: '00000000-0000-0000-0000-000000000004', full_name: 'فاطمة حسن', email: 'fatima@example.com', role: 'designer' },
  ]
  
  const { error } = await supabase.from('team_members').upsert(teamMembers, { onConflict: 'id' })
  
  if (error) {
    console.log('❌ Error setting up team members:', error.message)
    return false
  }
  
  console.log('✅ Team members created!')
  return true
}

async function createAdminUser() {
  console.log('\n👤 Creating admin user...')
  
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
      console.log('ℹ️ Admin user already exists, linking to team_members...')
      
      // Get existing user
      const { data: users } = await supabase.auth.admin.listUsers()
      const adminUser = users?.users?.find(u => u.email === 'admin@example.com')
      
      if (adminUser) {
        const { error: updateError } = await supabase
          .from('team_members')
          .update({ user_id: adminUser.id })
          .eq('email', 'admin@example.com')
        
        if (!updateError) {
          console.log('✅ Linked existing user to team_members')
        }
      }
      return true
    }
    console.log('❌ Error creating admin user:', error.message)
    return false
  }
  
  // Link user to team_members
  if (data.user) {
    const { error: updateError } = await supabase
      .from('team_members')
      .update({ user_id: data.user.id })
      .eq('email', 'admin@example.com')
    
    if (updateError) {
      console.log('⚠️ Could not link user to team_members:', updateError.message)
    }
  }
  
  console.log('✅ Admin user created!')
  console.log('   Email: admin@example.com')
  console.log('   Password: Admin123!')
  return true
}

async function checkTables() {
  console.log('\n🔍 Checking if tables exist...')
  
  const { data, error } = await supabase.from('platforms').select('count').limit(1)
  
  if (error) {
    console.log('❌ Tables do not exist. Please run the SQL schema first.')
    console.log('   Error:', error.message)
    return false
  }
  
  console.log('✅ Tables exist!')
  return true
}

async function main() {
  console.log('🚀 Starting database setup...\n')
  console.log('=' .repeat(50))
  
  // Check if tables exist
  const tablesExist = await checkTables()
  
  if (!tablesExist) {
    console.log('\n⚠️ Tables do not exist!')
    console.log('Please run the SQL schema in Supabase SQL Editor first:')
    console.log('1. Open https://supabase.com/dashboard')
    console.log('2. Go to SQL Editor')
    console.log('3. Run scripts/001_create_schema.sql')
    console.log('4. Then run this script again')
    process.exit(1)
  }
  
  // Setup data
  await setupPlatforms()
  await setupClients()
  await setupPlans()
  await setupPosts()
  await setupTeamMembers()
  await createAdminUser()
  
  console.log('\n' + '=' .repeat(50))
  console.log('🎉 Database setup complete!')
  console.log('\n📋 Login credentials:')
  console.log('   Email: admin@example.com')
  console.log('   Password: Admin123!')
  console.log('\n🌐 Open http://localhost:3000/auth/login to sign in')
}

main().catch(console.error)
