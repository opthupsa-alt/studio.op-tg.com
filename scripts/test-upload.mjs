// Test upload directly to Supabase
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = "https://poouovsuyhnnrqtqeybq.supabase.co"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvb3VvdnN1eWhubnJxdHFleWJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3MjkwNywiZXhwIjoyMDg0OTQ4OTA3fQ.J71PHq82CNkQBg9DP4E_Mg3HCe-2v542oujY_qu3ToE"

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testUpload() {
  console.log('Testing Supabase Storage Upload...\n')
  
  // Check bucket configuration
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
  console.log('Buckets:', buckets?.map(b => `${b.name} (public: ${b.public})`))
  
  // Check existing policies on storage.objects
  const { data: policies, error: policiesError } = await supabase
    .from('pg_policies')
    .select('*')
    
  if (policiesError) {
    // Try raw query
    const { data, error } = await supabase.rpc('get_storage_policies')
    if (error) {
      console.log('Cannot query policies directly, checking via upload test...')
    }
  }
  
  // Test upload with service role (should always work)
  const testContent = Buffer.from('test file content')
  const testPath = `test-folder/test-${Date.now()}.txt`
  
  console.log(`\nUploading test file to: ${testPath}`)
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('post-assets')
    .upload(testPath, testContent, {
      contentType: 'text/plain'
    })
  
  if (uploadError) {
    console.error('❌ Upload failed:', uploadError)
  } else {
    console.log('✅ Upload succeeded:', uploadData)
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('post-assets')
      .getPublicUrl(testPath)
    console.log('Public URL:', urlData.publicUrl)
    
    // Clean up test file
    const { error: deleteError } = await supabase.storage
      .from('post-assets')
      .remove([testPath])
    
    if (deleteError) {
      console.log('⚠️  Could not delete test file:', deleteError)
    } else {
      console.log('✅ Test file cleaned up')
    }
  }
  
  // Check RLS policies
  console.log('\n--- Checking RLS Policies ---')
  const { data: rlsData, error: rlsError } = await supabase.rpc('check_rls_policies')
  if (rlsError) {
    // Query directly
    const result = await supabase.from('_metadata').select('*').limit(1)
  }
  
  // List files in bucket
  console.log('\n--- Existing files in post-assets ---')
  const { data: files, error: filesError } = await supabase.storage
    .from('post-assets')
    .list('', { limit: 10 })
  
  if (filesError) {
    console.error('Error listing files:', filesError)
  } else {
    console.log('Files/Folders:', files?.map(f => f.name))
  }
}

testUpload()
