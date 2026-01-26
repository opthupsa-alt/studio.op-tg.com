-- =====================================================
-- Storage Security Policies
-- Version: 010
-- Date: 2026-01-26
-- Purpose: Secure post-assets bucket with tenant isolation
-- =====================================================

-- =====================================================
-- STEP 1: Create bucket if not exists (private by default)
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-assets',
  'post-assets',
  false, -- PRIVATE bucket
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false, -- Ensure it's private
  file_size_limit = 52428800;

-- =====================================================
-- STEP 2: Drop existing storage policies
-- =====================================================

DROP POLICY IF EXISTS "post_assets_select" ON storage.objects;
DROP POLICY IF EXISTS "post_assets_insert" ON storage.objects;
DROP POLICY IF EXISTS "post_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "post_assets_delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- =====================================================
-- STEP 3: Helper function to extract post_id from path
-- Path format: {client_id}/{post_id}/{filename}
-- =====================================================

CREATE OR REPLACE FUNCTION storage.get_post_id_from_path(path TEXT)
RETURNS UUID AS $$
DECLARE
  parts TEXT[];
  post_uuid UUID;
BEGIN
  -- Split path by /
  parts := string_to_array(path, '/');
  
  -- Path should be: client_id/post_id/filename
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 4: Helper function to check post access
-- =====================================================

CREATE OR REPLACE FUNCTION storage.can_access_post_asset(object_path TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  post_uuid UUID;
  post_client_id UUID;
  user_role TEXT;
  user_client_id UUID;
  user_team_member_id UUID;
BEGIN
  -- Get post_id from path
  post_uuid := storage.get_post_id_from_path(object_path);
  
  IF post_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get post's client_id
  SELECT client_id INTO post_client_id
  FROM posts
  WHERE id = post_uuid;
  
  IF post_client_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get current user's info
  SELECT tm.role, tm.client_id, tm.id 
  INTO user_role, user_client_id, user_team_member_id
  FROM team_members tm
  WHERE tm.user_id = auth.uid();
  
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Admin/Manager can access all
  IF user_role IN ('admin', 'manager') THEN
    RETURN true;
  END IF;
  
  -- Client can only access their own client's assets
  IF user_role = 'client' THEN
    RETURN user_client_id = post_client_id;
  END IF;
  
  -- Writer/Designer can access if assigned to post or client
  RETURN EXISTS (
    SELECT 1 FROM posts p
    WHERE p.id = post_uuid
    AND (
      p.assigned_writer = user_team_member_id
      OR p.assigned_designer = user_team_member_id
    )
  )
  OR EXISTS (
    SELECT 1 FROM team_member_clients tmc
    WHERE tmc.team_member_id = user_team_member_id
    AND tmc.client_id = post_client_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 5: SELECT policy - Read access based on post access
-- =====================================================

CREATE POLICY "post_assets_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'post-assets'
    AND storage.can_access_post_asset(name)
  );

-- =====================================================
-- STEP 6: INSERT policy - Upload only if:
-- - Not a client user
-- - Has access to the post
-- - Post is not locked
-- =====================================================

CREATE POLICY "post_assets_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'post-assets'
    AND auth.uid() IS NOT NULL
    AND NOT (
      SELECT role = 'client' 
      FROM team_members 
      WHERE user_id = auth.uid()
    )
    AND storage.can_access_post_asset(name)
    AND NOT EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = storage.get_post_id_from_path(name)
      AND p.locked = true
    )
  );

-- =====================================================
-- STEP 7: UPDATE policy - Same as INSERT
-- =====================================================

CREATE POLICY "post_assets_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'post-assets'
    AND auth.uid() IS NOT NULL
    AND NOT (
      SELECT role = 'client' 
      FROM team_members 
      WHERE user_id = auth.uid()
    )
    AND storage.can_access_post_asset(name)
  );

-- =====================================================
-- STEP 8: DELETE policy - Admin/Manager only
-- =====================================================

CREATE POLICY "post_assets_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'post-assets'
    AND (
      SELECT role IN ('admin', 'manager')
      FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- DONE!
-- =====================================================

SELECT 'Storage Security Policies applied successfully!' as result;
