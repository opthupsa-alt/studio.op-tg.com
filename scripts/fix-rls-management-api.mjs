// Use Supabase Management API to execute SQL
const PROJECT_REF = "poouovsuyhnnrqtqeybq"

// Get access token from environment or use service key approach
async function getAccessToken() {
  // For Management API, we need a personal access token or use the database connection directly
  // Since we have POSTGRES_URL, let's use that approach with node-postgres
  return null
}

// Alternative: Use the database URL directly with a different approach
import pg from 'pg'

const connectionString = "postgres://postgres.poouovsuyhnnrqtqeybq:Jn0wcmwIOtOenXhk@aws-1-us-east-1.pooler.supabase.com:6543/postgres"

async function executeSQL() {
  // Use transaction mode connection (port 6543)
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('Connecting to database...')
    await client.connect()
    console.log('Connected!\n')

    // Execute DROP statements first
    const dropStatements = [
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
    ]

    for (const sql of dropStatements) {
      try {
        await client.query(sql)
        console.log('✅ Dropped:', sql.substring(20, 70))
      } catch (e) {
        console.log('⚠️  Skip:', e.message.substring(0, 50))
      }
    }

    // Create new policies
    console.log('\nCreating new policies...')

    // SELECT policy
    try {
      await client.query(`
        CREATE POLICY "post_assets_select" ON storage.objects 
        FOR SELECT TO authenticated 
        USING (bucket_id = 'post-assets')
      `)
      console.log('✅ Created SELECT policy')
    } catch (e) {
      console.log('⚠️  SELECT policy:', e.message.substring(0, 80))
    }

    // INSERT policy
    try {
      await client.query(`
        CREATE POLICY "post_assets_insert" ON storage.objects 
        FOR INSERT TO authenticated 
        WITH CHECK (
          bucket_id = 'post-assets' 
          AND auth.uid() IS NOT NULL 
          AND NOT EXISTS (
            SELECT 1 FROM public.team_members 
            WHERE user_id = auth.uid() AND role = 'client'
          )
        )
      `)
      console.log('✅ Created INSERT policy')
    } catch (e) {
      console.log('⚠️  INSERT policy:', e.message.substring(0, 80))
    }

    // UPDATE policy
    try {
      await client.query(`
        CREATE POLICY "post_assets_update" ON storage.objects 
        FOR UPDATE TO authenticated 
        USING (
          bucket_id = 'post-assets' 
          AND auth.uid() IS NOT NULL
        )
      `)
      console.log('✅ Created UPDATE policy')
    } catch (e) {
      console.log('⚠️  UPDATE policy:', e.message.substring(0, 80))
    }

    // DELETE policy
    try {
      await client.query(`
        CREATE POLICY "post_assets_delete" ON storage.objects 
        FOR DELETE TO authenticated 
        USING (
          bucket_id = 'post-assets' 
          AND EXISTS (
            SELECT 1 FROM public.team_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
          )
        )
      `)
      console.log('✅ Created DELETE policy')
    } catch (e) {
      console.log('⚠️  DELETE policy:', e.message.substring(0, 80))
    }

    // Ensure bucket is public
    try {
      await client.query(`UPDATE storage.buckets SET public = true WHERE id = 'post-assets'`)
      console.log('✅ Bucket set to public')
    } catch (e) {
      console.log('⚠️  Bucket update:', e.message)
    }

    console.log('\n✅ Storage RLS policies update completed!')

  } catch (error) {
    console.error('Error:', error.message)
    
    if (error.message.includes('self-signed certificate')) {
      console.log('\n📋 Please run this SQL manually in Supabase Dashboard > SQL Editor:')
      console.log('=' .repeat(60))
      console.log(`
-- Drop existing policies
DROP POLICY IF EXISTS "post_assets_select" ON storage.objects;
DROP POLICY IF EXISTS "post_assets_insert" ON storage.objects;
DROP POLICY IF EXISTS "post_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "post_assets_delete" ON storage.objects;

-- Create SELECT policy
CREATE POLICY "post_assets_select" ON storage.objects 
FOR SELECT TO authenticated 
USING (bucket_id = 'post-assets');

-- Create INSERT policy (non-client users only)
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

-- Create UPDATE policy
CREATE POLICY "post_assets_update" ON storage.objects 
FOR UPDATE TO authenticated 
USING (bucket_id = 'post-assets' AND auth.uid() IS NOT NULL);

-- Create DELETE policy (admin/manager only)
CREATE POLICY "post_assets_delete" ON storage.objects 
FOR DELETE TO authenticated 
USING (
  bucket_id = 'post-assets' 
  AND EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Make bucket public
UPDATE storage.buckets SET public = true WHERE id = 'post-assets';
`)
    }
  } finally {
    await client.end()
  }
}

executeSQL()
