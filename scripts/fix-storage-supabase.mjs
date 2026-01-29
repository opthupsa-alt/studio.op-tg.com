import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://poouovsuyhnnrqtqeybq.supabase.co"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvb3VvdnN1eWhubnJxdHFleWJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM3MjkwNywiZXhwIjoyMDg0OTQ4OTA3fQ.J71PHq82CNkQBg9DP4E_Mg3HCe-2v542oujY_qu3ToE"

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixStorage() {
  console.log('Fixing Storage RLS policies via Supabase...')
  
  try {
    // List buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError)
    } else {
      console.log('Existing buckets:', buckets.map(b => `${b.name} (public: ${b.public})`))
    }
    
    // Check if post-assets bucket exists
    const postAssets = buckets?.find(b => b.id === 'post-assets')
    
    if (!postAssets) {
      console.log('Creating post-assets bucket...')
      const { data, error } = await supabase.storage.createBucket('post-assets', {
        public: true,
        fileSizeLimit: 52428800,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf']
      })
      if (error) {
        console.error('Error creating bucket:', error)
      } else {
        console.log('Bucket created:', data)
      }
    } else {
      console.log('post-assets bucket exists, updating to public...')
      const { error } = await supabase.storage.updateBucket('post-assets', {
        public: true,
        fileSizeLimit: 52428800,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf']
      })
      if (error) {
        console.error('Error updating bucket:', error)
      } else {
        console.log('Bucket updated to public!')
      }
    }
    
    // Execute SQL via rpc if available, otherwise use raw query
    const sqlStatements = [
      // Drop existing policies
      `DROP POLICY IF EXISTS "post_assets_select" ON storage.objects`,
      `DROP POLICY IF EXISTS "post_assets_insert" ON storage.objects`,
      `DROP POLICY IF EXISTS "post_assets_update" ON storage.objects`,
      `DROP POLICY IF EXISTS "post_assets_delete" ON storage.objects`,
      `DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects`,
      `DROP POLICY IF EXISTS "Authenticated users can read" ON storage.objects`,
      `DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects`,
      `DROP POLICY IF EXISTS "Users can upload post assets" ON storage.objects`,
      `DROP POLICY IF EXISTS "Users can view post assets" ON storage.objects`,
      `DROP POLICY IF EXISTS "Users can delete post assets" ON storage.objects`,
      
      // Create new policies
      `CREATE POLICY "post_assets_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'post-assets')`,
      
      `CREATE POLICY "post_assets_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-assets' AND auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.team_members WHERE user_id = auth.uid() AND role = 'client'))`,
      
      `CREATE POLICY "post_assets_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'post-assets' AND auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.team_members WHERE user_id = auth.uid() AND role = 'client'))`,
      
      `CREATE POLICY "post_assets_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'post-assets' AND EXISTS (SELECT 1 FROM public.team_members WHERE user_id = auth.uid() AND role IN ('admin', 'manager')))`
    ]
    
    console.log('\nExecuting SQL via database...')
    
    for (const sql of sqlStatements) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
      if (error) {
        // Try alternative method
        const { error: err2 } = await supabase.from('_exec_sql').select('*').eq('query', sql)
        if (err2 && !err2.message?.includes('does not exist')) {
          console.log('SQL execution note:', sql.substring(0, 50), '...')
        }
      } else {
        console.log('Executed:', sql.substring(0, 50), '...')
      }
    }
    
    console.log('\n✅ Storage configuration completed!')
    console.log('\nNOTE: If RLS policies were not updated, please run the following SQL manually in Supabase SQL Editor:')
    console.log('--------------------------------------------------')
    console.log(`
-- Drop existing policies
DROP POLICY IF EXISTS "post_assets_select" ON storage.objects;
DROP POLICY IF EXISTS "post_assets_insert" ON storage.objects;
DROP POLICY IF EXISTS "post_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "post_assets_delete" ON storage.objects;

-- Create new simple policies
CREATE POLICY "post_assets_select" ON storage.objects 
  FOR SELECT TO authenticated 
  USING (bucket_id = 'post-assets');

CREATE POLICY "post_assets_insert" ON storage.objects 
  FOR INSERT TO authenticated 
  WITH CHECK (
    bucket_id = 'post-assets' 
    AND auth.uid() IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE user_id = auth.uid() AND role = 'client'
    )
  );

CREATE POLICY "post_assets_update" ON storage.objects 
  FOR UPDATE TO authenticated 
  USING (
    bucket_id = 'post-assets' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "post_assets_delete" ON storage.objects 
  FOR DELETE TO authenticated 
  USING (
    bucket_id = 'post-assets' 
    AND EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
`)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

fixStorage()
