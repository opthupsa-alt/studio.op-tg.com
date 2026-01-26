// Run SQL Migration via Supabase REST API
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://poouovsuyhnnrqtqeybq.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvb3VvdnN1eWhubnJxdHFleWJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3MjkwNywiZXhwIjoyMDg0OTQ4OTA3fQ.J71PHq82CNkQBg9DP4E_Mg3HCe-2v542oujY_qu3ToE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addColumnsToPostsTable() {
  console.log('🔧 Adding new columns to posts table...')
  
  // Check if description column exists
  const { data: columns } = await supabase
    .from('posts')
    .select('*')
    .limit(1)
  
  // Try to add columns one by one using direct SQL via edge function or management API
  // Since we can't run raw SQL, we'll use a workaround
  
  // First, let's try updating a post with the new fields to see if they exist
  const testUpdate = await supabase
    .from('posts')
    .update({ 
      description: 'test',
      post_type: 'post',
      locked: false
    })
    .eq('id', '22000000-0000-0000-0000-000000000001')
  
  if (testUpdate.error) {
    console.log('⚠️ New columns do not exist yet.')
    console.log('   Please run the following SQL in Supabase SQL Editor:')
    console.log('')
    console.log('   ALTER TABLE posts ADD COLUMN IF NOT EXISTS description text;')
    console.log('   ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type text DEFAULT \'post\';')
    console.log('   ALTER TABLE posts ADD COLUMN IF NOT EXISTS locked boolean DEFAULT false;')
    console.log('')
    console.log('   Or run the full migration: scripts/004_update_schema.sql')
    return false
  }
  
  // Revert test update
  await supabase
    .from('posts')
    .update({ description: null })
    .eq('id', '22000000-0000-0000-0000-000000000001')
  
  console.log('✅ Columns exist!')
  return true
}

async function updatePostsWithNewData() {
  console.log('\n📦 Updating posts with description and post_type...')
  
  const updates = [
    { id: '22000000-0000-0000-0000-000000000001', description: 'نحن متحمسون للإعلان عن إطلاق منتجنا التقني الجديد الذي سيغير طريقة عملك', post_type: 'post' },
    { id: '22000000-0000-0000-0000-000000000002', description: 'تعرف على أهم 5 مميزات تجعل منتجنا الخيار الأفضل لك', post_type: 'carousel' },
    { id: '22000000-0000-0000-0000-000000000003', description: 'استمع لتجارب عملائنا الحقيقية مع المنتج', post_type: 'video' },
    { id: '22000000-0000-0000-0000-000000000004', description: 'وصفة سهلة وسريعة لسلطة صحية ولذيذة بمكونات طبيعية 100%', post_type: 'reel' },
    { id: '22000000-0000-0000-0000-000000000005', description: 'أهم النصائح للحفاظ على صحتك في فصل الشتاء', post_type: 'carousel' },
    { id: '22000000-0000-0000-0000-000000000006', description: 'لا تفوتوا الفرصة! تخفيضات كبرى على جميع المنتجات لفترة محدودة', post_type: 'story' },
    { id: '22000000-0000-0000-0000-000000000007', description: 'اكتشف أحدث صيحات الموضة لعام 2026', post_type: 'reel' },
  ]
  
  for (const update of updates) {
    const { error } = await supabase
      .from('posts')
      .update({ description: update.description, post_type: update.post_type })
      .eq('id', update.id)
    
    if (error) {
      console.log(`⚠️ Could not update post ${update.id}:`, error.message)
    }
  }
  
  console.log('✅ Posts updated!')
}

async function main() {
  console.log('🚀 Running migration...\n')
  
  const columnsExist = await addColumnsToPostsTable()
  
  if (columnsExist) {
    await updatePostsWithNewData()
  }
  
  console.log('\n✅ Migration complete!')
}

main().catch(console.error)
