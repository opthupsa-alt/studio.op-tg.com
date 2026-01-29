import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixStorageRLS() {
  console.log('Fixing Storage RLS policies...')
  
  try {
    // Read the SQL file
    const sqlPath = join(__dirname, '011_fix_storage_rls.sql')
    const sql = readFileSync(sqlPath, 'utf8')
    
    // Split into individual statements and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('SELECT'))
    
    for (const statement of statements) {
      if (statement.length > 10) {
        console.log('Executing:', statement.substring(0, 60) + '...')
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
        if (error) {
          // Ignore policy not found errors
          if (!error.message.includes('does not exist')) {
            console.warn('Warning:', error.message)
          }
        }
      }
    }
    
    console.log('Storage RLS policies update attempted.')
    
    // Verify bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError)
    } else {
      console.log('Buckets:', buckets.map(b => b.name))
      
      const postAssets = buckets.find(b => b.id === 'post-assets')
      if (postAssets) {
        console.log('post-assets bucket config:', postAssets)
      } else {
        console.log('Creating post-assets bucket...')
        const { error: createError } = await supabase.storage.createBucket('post-assets', {
          public: true,
          fileSizeLimit: 52428800,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf']
        })
        if (createError) {
          console.error('Error creating bucket:', createError)
        } else {
          console.log('post-assets bucket created!')
        }
      }
    }
    
    console.log('Done!')
  } catch (error) {
    console.error('Error:', error)
  }
}

fixStorageRLS()
