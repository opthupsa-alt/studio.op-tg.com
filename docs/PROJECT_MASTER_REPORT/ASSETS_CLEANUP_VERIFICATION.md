# Assets Cleanup Verification

## Date: 2026-01-26
## Status: ✅ IMPLEMENTED - Requires Manual Testing

---

## 1. Implementation Summary

The `deletePost` function in `lib/actions.ts` has been updated to:
1. Fetch all assets associated with the post
2. Extract file paths from asset URLs
3. Delete files from Supabase Storage
4. Delete the post (assets cascade delete via FK)

### Code Location
`lib/actions.ts` - `deletePost` function (lines 128-169)

---

## 2. Implementation Code

```typescript
export async function deletePost(id: string) {
  const supabase = await createClient()

  // First, get all assets associated with this post
  const { data: assets } = await supabase
    .from("assets")
    .select("id, url")
    .eq("post_id", id)

  // Delete files from storage if any
  if (assets && assets.length > 0) {
    const filePaths = assets
      .map(asset => {
        // Extract path from URL: https://xxx.supabase.co/storage/v1/object/public/post-assets/path
        const match = asset.url?.match(/post-assets\/(.+)$/)
        return match ? match[1] : null
      })
      .filter(Boolean) as string[]

    if (filePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("post-assets")
        .remove(filePaths)

      if (storageError) {
        console.error("Error deleting storage files:", storageError)
        // Continue with post deletion even if storage cleanup fails
      }
    }
  }

  // Delete the post (assets will be cascade deleted via FK)
  const { error } = await supabase.from("posts").delete().eq("id", id)

  if (error) {
    console.error("Error deleting post:", error)
    return { error: error.message }
  }

  revalidateAll()
  return { success: true }
}
```

---

## 3. Verification Test Steps

### Test 1: Upload Assets and Delete Post

**Steps:**
1. Create a new post
2. Upload 2 files (e.g., image1.jpg, image2.png)
3. Verify files appear in Storage bucket
4. Delete the post
5. Check Storage bucket - files should be deleted
6. Check assets table - no orphan records

**Expected Results:**
- Storage files deleted
- Assets table has no records for deleted post
- No orphan files in storage

**Actual Results:** ⏳ Pending manual test

---

### Test 2: Verify No Orphan Records

**SQL Query:**
```sql
-- Check for orphan assets (assets without valid post)
SELECT a.* FROM assets a
LEFT JOIN posts p ON a.post_id = p.id
WHERE p.id IS NULL;

-- Expected: 0 rows
```

**Result:** ⏳ Pending

---

### Test 3: Storage Bucket Verification

**Steps:**
1. Go to Supabase Dashboard → Storage → post-assets
2. Note file count before delete
3. Delete post with assets
4. Refresh and check file count

**Expected:** File count decreased by number of deleted assets

**Result:** ⏳ Pending

---

## 4. Edge Cases Handled

| Scenario | Handling |
|----------|----------|
| Post with no assets | Skips storage deletion |
| Storage deletion fails | Logs error, continues with post deletion |
| Invalid asset URL | Filtered out, doesn't break deletion |
| Assets table cascade | FK ON DELETE CASCADE handles DB cleanup |

---

## 5. Verification Checklist

- [ ] Upload 2+ assets to a post
- [ ] Verify assets visible in Storage bucket
- [ ] Delete the post
- [ ] Verify Storage files are deleted
- [ ] Verify assets table has no orphan records
- [ ] Verify post is deleted from posts table

---

## 6. Test Execution Log

| Test | Date | Tester | Result | Notes |
|------|------|--------|--------|-------|
| Upload & Delete | - | - | ⏳ | - |
| Orphan Check | - | - | ⏳ | - |
| Storage Verify | - | - | ⏳ | - |

---

## 7. Screenshots

### Before Delete
> [Add screenshot of Storage bucket with files]

### After Delete
> [Add screenshot of Storage bucket without files]

### Assets Table Query
> [Add screenshot of orphan check query result]
