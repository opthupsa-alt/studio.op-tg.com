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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    envVars[key.trim()] = value
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixShareLinksTable() {
  console.log('🔧 Fixing share_links table...')

  // Try to add password column if it doesn't exist
  const { error: alterError } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE share_links ADD COLUMN IF NOT EXISTS password TEXT;
    `
  })

  if (alterError) {
    console.log('RPC not available, trying direct approach...')
    
    // Try direct insert with password to see if column exists
    const { error: testError } = await supabase
      .from('share_links')
      .select('password')
      .limit(1)
    
    if (testError && testError.message.includes('password')) {
      console.log('⚠️ Column password does not exist.')
      console.log('Please run this SQL in Supabase Dashboard:')
      console.log('')
      console.log('ALTER TABLE share_links ADD COLUMN password TEXT;')
      console.log('')
    } else {
      console.log('✅ password column exists!')
    }
    return
  }

  console.log('✅ share_links table fixed!')
}

async function createStorageBucket() {
  console.log('🔧 Creating storage bucket...')

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  
  if (listError) {
    console.error('Error listing buckets:', listError)
    return
  }

  const bucketExists = buckets?.some(b => b.name === 'post-assets')
  
  if (bucketExists) {
    console.log('✅ post-assets bucket already exists!')
    return
  }

  // Create bucket
  const { error: createError } = await supabase.storage.createBucket('post-assets', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ['image/*', 'video/*', 'application/pdf']
  })

  if (createError) {
    console.error('Error creating bucket:', createError)
    console.log('')
    console.log('Please create the bucket manually in Supabase Dashboard:')
    console.log('1. Go to Storage')
    console.log('2. Create new bucket named "post-assets"')
    console.log('3. Make it public')
    return
  }

  console.log('✅ post-assets bucket created!')
}

async function main() {
  await fixShareLinksTable()
  await createStorageBucket()
}

main()
