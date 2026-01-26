import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createBucket() {
  console.log('🔧 Creating client-assets bucket...')

  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === 'client-assets')
  
  if (exists) {
    console.log('✅ Bucket already exists!')
    return
  }

  const { error } = await supabase.storage.createBucket('client-assets', {
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['image/*']
  })

  if (error) {
    console.error('Error:', error.message)
  } else {
    console.log('✅ Bucket created!')
  }
}

createBucket()
