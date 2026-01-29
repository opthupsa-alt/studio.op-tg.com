-- =====================================================
-- Fix Storage RLS Policies
-- Version: 011
-- Date: 2026-01-29
-- Purpose: Fix storage RLS to allow authenticated uploads
-- =====================================================

-- Drop all existing storage policies for post-assets bucket
DROP POLICY IF EXISTS "post_assets_select" ON storage.objects;
DROP POLICY IF EXISTS "post_assets_insert" ON storage.objects;
DROP POLICY IF EXISTS "post_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "post_assets_delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload post assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can view post assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete post assets" ON storage.objects;

-- =====================================================
-- Create simple and working storage policies
-- Path format: {client_id}/{post_id}/{filename}
-- =====================================================

-- Helper function to get client_id from path
CREATE OR REPLACE FUNCTION storage.get_client_id_from_path(path TEXT)
RETURNS UUID AS $$
DECLARE
  parts TEXT[];
  client_uuid UUID;
BEGIN
  parts := string_to_array(path, '/');
  IF array_length(parts, 1) >= 1 THEN
    BEGIN
      client_uuid := parts[1]::UUID;
      RETURN client_uuid;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function to get post_id from path
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- SELECT Policy - Authenticated users can read post-assets
-- =====================================================
CREATE POLICY "post_assets_select" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'post-assets');

-- =====================================================
-- INSERT Policy - Non-client authenticated users can upload
-- =====================================================
CREATE POLICY "post_assets_insert" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'post-assets'
    AND auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM team_members 
      WHERE user_id = auth.uid() 
      AND role = 'client'
    )
  );

-- =====================================================
-- UPDATE Policy - Same as INSERT
-- =====================================================
CREATE POLICY "post_assets_update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'post-assets'
    AND auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM team_members 
      WHERE user_id = auth.uid() 
      AND role = 'client'
    )
  );

-- =====================================================
-- DELETE Policy - Admin/Manager can delete
-- =====================================================
CREATE POLICY "post_assets_delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'post-assets'
    AND EXISTS (
      SELECT 1 FROM team_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- Ensure bucket exists and is properly configured
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-assets',
  'post-assets',
  true, -- Make public for easier access
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf'];

SELECT 'Storage RLS policies fixed successfully!' as result;
