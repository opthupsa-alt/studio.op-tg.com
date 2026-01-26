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
    // Remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    envVars[key.trim()] = value
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearPosts() {
  console.log('🗑️ تفريغ جدول المنشورات...')

  // Delete all related data first (due to foreign keys)
  const tables = ['comments', 'approvals', 'assets', 'post_platforms', 'post_variants']
  
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().not('id', 'is', null)
    if (error) {
      console.log(`⚠️ خطأ في حذف ${table}:`, error.message)
    } else {
      console.log(`✅ تم حذف بيانات ${table}`)
    }
  }

  // Now delete posts
  const { error: postsError } = await supabase.from('posts').delete().not('id', 'is', null)
  
  if (postsError) {
    console.error('❌ خطأ في حذف المنشورات:', postsError.message)
  } else {
    console.log('✅ تم تفريغ جدول المنشورات بنجاح!')
  }
}

clearPosts()
