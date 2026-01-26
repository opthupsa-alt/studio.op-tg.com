-- =====================================================
-- Storage Setup for Content Planning Platform
-- Version: 007
-- Date: 2026-01-26
-- =====================================================
-- This script sets up Supabase Storage for file uploads

-- =====================================================
-- 1. Create storage bucket for post assets
-- =====================================================
-- Note: Run this in Supabase Dashboard > Storage > New Bucket
-- Or via Supabase CLI

-- Bucket name: post-assets
-- Public: false (we'll use signed URLs)
-- File size limit: 50MB
-- Allowed MIME types: image/*, video/*, application/pdf

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-assets',
  'post-assets',
  false,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- 2. Storage RLS Policies
-- =====================================================

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload post assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-assets'
  AND (
    -- Admin/Manager can upload anywhere
    get_user_role() IN ('admin', 'manager')
    OR (
      -- Writer/Designer can upload to posts they have access to
      get_user_role() IN ('writer', 'designer')
      AND EXISTS (
        SELECT 1 FROM posts p
        WHERE p.id::text = (storage.foldername(name))[1]
        AND user_has_client_access(p.client_id)
      )
    )
  )
);

-- Allow users to view files they have access to
CREATE POLICY "Users can view post assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'post-assets'
  AND (
    get_user_role() IN ('admin', 'manager')
    OR EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id::text = (storage.foldername(name))[1]
      AND user_has_client_access(p.client_id)
    )
  )
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete post assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-assets'
  AND (
    get_user_role() IN ('admin', 'manager')
    OR (
      get_user_role() IN ('writer', 'designer')
      AND EXISTS (
        SELECT 1 FROM posts p
        WHERE p.id::text = (storage.foldername(name))[1]
        AND user_has_client_access(p.client_id)
        AND NOT p.locked
      )
    )
  )
);

-- =====================================================
-- Done!
-- =====================================================
SELECT 'Storage bucket and policies created successfully!' as result;
