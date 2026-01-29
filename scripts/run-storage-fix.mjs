import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const connectionString = process.env.POSTGRES_URL

if (!connectionString) {
  console.error('Missing POSTGRES_URL')
  process.exit(1)
}

const client = new pg.Client({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
})

async function run() {
  try {
    await client.connect()
    console.log('Connected to database')

    // Drop existing policies
    const dropPolicies = [
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

    for (const sql of dropPolicies) {
      try {
        await client.query(sql)
        console.log('Dropped policy:', sql.substring(0, 50))
      } catch (e) {
        // Ignore errors for non-existent policies
      }
    }

    // Create helper functions
    await client.query(`
      CREATE OR REPLACE FUNCTION storage.get_post_id_from_path(path TEXT)
      RETURNS UUID AS $$
      DECLARE
        parts TEXT[];
        post_uuid UUID;
      BEGIN
        parts := string_to_array(path, '/');
        IF array_length(parts, 1) >= 2 THEN
          BEGIN
            post_uuid := parts[2]::UUID;
            RETURN post_uuid;
          EXCEPTION WHEN OTHERS THEN
            RETURN NULL;
          END;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER STABLE
    `)
    console.log('Created get_post_id_from_path function')

    // Create SELECT policy
    await client.query(`
      CREATE POLICY "post_assets_select" ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'post-assets')
    `)
    console.log('Created SELECT policy')

    // Create INSERT policy - allow all authenticated non-client users
    await client.query(`
      CREATE POLICY "post_assets_insert" ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'post-assets'
        AND auth.uid() IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.team_members 
          WHERE user_id = auth.uid() 
          AND role = 'client'
        )
      )
    `)
    console.log('Created INSERT policy')

    // Create UPDATE policy
    await client.query(`
      CREATE POLICY "post_assets_update" ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'post-assets'
        AND auth.uid() IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.team_members 
          WHERE user_id = auth.uid() 
          AND role = 'client'
        )
      )
    `)
    console.log('Created UPDATE policy')

    // Create DELETE policy
    await client.query(`
      CREATE POLICY "post_assets_delete" ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'post-assets'
        AND EXISTS (
          SELECT 1 FROM public.team_members
          WHERE user_id = auth.uid()
          AND role IN ('admin', 'manager')
        )
      )
    `)
    console.log('Created DELETE policy')

    // Ensure bucket is public
    await client.query(`
      UPDATE storage.buckets 
      SET public = true 
      WHERE id = 'post-assets'
    `)
    console.log('Updated bucket to public')

    console.log('\n✅ Storage RLS policies fixed successfully!')

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await client.end()
  }
}

run()
