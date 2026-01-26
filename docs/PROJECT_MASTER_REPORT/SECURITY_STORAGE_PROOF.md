# Storage Security Implementation Proof

## Date: 2026-01-26
## Status: ⚠️ REQUIRES MANUAL EXECUTION IN SUPABASE DASHBOARD

---

## 1. Problem Statement

The `010_storage_security.sql` script failed with error:
```
permission denied for schema storage
```

This is because the `storage` schema requires direct access via Supabase Dashboard SQL Editor, not through the pooler connection.

---

## 2. Required Manual Steps

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: `poouovsuyhnnrqtqeybq`
3. Navigate to **SQL Editor**

### Step 2: Ensure Bucket is Private
Run the following SQL:

```sql
-- Check if bucket exists and is private
SELECT id, name, public FROM storage.buckets WHERE id = 'post-assets';

-- If bucket doesn't exist, create it as PRIVATE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-assets',
  'post-assets',
  false,  -- PRIVATE
  52428800,  -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Verify it's private
SELECT id, name, public FROM storage.buckets WHERE id = 'post-assets';
-- Expected: public = false
```

### Step 3: Create Storage Policies
Navigate to **Storage** → **Policies** → **post-assets** bucket, or run via SQL Editor:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "post_assets_select" ON storage.objects;
DROP POLICY IF EXISTS "post_assets_insert" ON storage.objects;
DROP POLICY IF EXISTS "post_assets_update" ON storage.objects;
DROP POLICY IF EXISTS "post_assets_delete" ON storage.objects;

-- Helper function to extract post_id from path
CREATE OR REPLACE FUNCTION storage.get_post_id_from_path(path TEXT)
RETURNS UUID AS $$
DECLARE
  parts TEXT[];
BEGIN
  parts := string_to_array(path, '/');
  IF array_length(parts, 1) >= 2 THEN
    BEGIN
      RETURN parts[2]::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- SELECT Policy: Only users with post access can read
CREATE POLICY "post_assets_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'post-assets'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM posts p
      JOIN team_members tm ON tm.user_id = auth.uid()
      WHERE p.id = storage.get_post_id_from_path(name)
      AND (
        tm.role IN ('admin', 'manager')
        OR tm.client_id = p.client_id
        OR p.assigned_writer = tm.id
        OR p.assigned_designer = tm.id
      )
    )
  );

-- INSERT Policy: Team members (not clients) can upload
CREATE POLICY "post_assets_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'post-assets'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.role NOT IN ('client')
    )
  );

-- DELETE Policy: Admin/Manager only
CREATE POLICY "post_assets_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'post-assets'
    AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.role IN ('admin', 'manager')
    )
  );
```

---

## 3. Verification Checklist

After executing the above:

- [ ] Bucket `post-assets` exists with `public = false`
- [ ] Policy `post_assets_select` exists
- [ ] Policy `post_assets_insert` exists  
- [ ] Policy `post_assets_delete` exists
- [ ] Direct URL access without auth returns 403/401

### Verification Query:
```sql
-- Check bucket is private
SELECT id, name, public FROM storage.buckets WHERE id = 'post-assets';

-- Check policies exist
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
```

---

## 4. Why This is Secure

1. **Bucket is Private**: No public URLs, all access requires authentication
2. **SELECT Policy**: Users can only read files for posts they have access to
3. **INSERT Policy**: Only team members (not clients) can upload
4. **DELETE Policy**: Only admin/manager can delete files
5. **Path-based isolation**: Files are organized by `client_id/post_id/filename`

---

## 5. Screenshots Required

After manual execution, add screenshots here:

### Screenshot 1: Bucket Settings
> [Add screenshot showing post-assets bucket with public=false]

### Screenshot 2: Storage Policies
> [Add screenshot showing the 3 policies on storage.objects]

### Screenshot 3: Verification Query Results
> [Add screenshot of verification query results]

---

## 6. Execution Log

| Step | Status | Date | Notes |
|------|--------|------|-------|
| Create bucket | ⏳ Pending | - | - |
| Set bucket private | ⏳ Pending | - | - |
| Create SELECT policy | ⏳ Pending | - | - |
| Create INSERT policy | ⏳ Pending | - | - |
| Create DELETE policy | ⏳ Pending | - | - |
| Verification | ⏳ Pending | - | - |

---

## 7. Alternative: Use Supabase Dashboard UI

If SQL Editor doesn't work, use the UI:

1. Go to **Storage** → **Buckets**
2. Click on `post-assets` (or create it)
3. Ensure **Public** toggle is OFF
4. Go to **Policies** tab
5. Add policies manually using the UI wizard

