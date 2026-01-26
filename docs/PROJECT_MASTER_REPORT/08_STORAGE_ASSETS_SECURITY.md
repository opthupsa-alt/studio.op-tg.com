# 08 - Storage & Assets Security
## أمان التخزين والملفات

**تاريخ التقرير:** 2026-01-26

---

## 1. إعداد Storage Bucket

### المعلومات الأساسية
| الخاصية | القيمة |
|---------|--------|
| **Bucket Name** | `post-assets` |
| **Provider** | Supabase Storage |
| **الملف المرجعي** | `scripts/007_storage_setup.sql`, `scripts/010_storage_security.sql` |

### إنشاء الـ Bucket
```sql
-- scripts/007_storage_setup.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-assets', 'post-assets', false)  -- ← يجب أن يكون false
ON CONFLICT (id) DO NOTHING;
```

---

## 2. هل الـ Bucket Public أم Private؟

### الحالة المطلوبة: 🔒 Private

### الحالة الفعلية: 🚨 يحتاج تحقق

**للتحقق:**
```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'post-assets';
-- يجب أن يكون public = false
```

**أو عبر Dashboard:**
```
Supabase Dashboard → Storage → post-assets → Settings → Public bucket: OFF
```

### المخاطر إذا كان Public
| الخطر | التأثير |
|-------|---------|
| 🚨 تسريب ملفات العملاء | أي شخص يعرف URL يمكنه الوصول |
| 🚨 لا يوجد تحكم بالوصول | لا يمكن منع عميل من رؤية ملفات عميل آخر |
| 🚨 SEO indexing | محركات البحث قد تفهرس الملفات |

---

## 3. سياسات Storage RLS

### السياسات المكتوبة (في scripts/010_storage_security.sql)

#### سياسة القراءة (SELECT)
```sql
CREATE POLICY "Users can view assets of their clients"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'post-assets'
  AND (
    -- Admin/Manager can see all
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.role IN ('admin', 'manager')
    )
    OR
    -- Others can see their client's assets
    EXISTS (
      SELECT 1 FROM assets a
      JOIN posts p ON a.post_id = p.id
      WHERE a.url LIKE '%' || storage.objects.name || '%'
      AND p.client_id IN (SELECT get_user_client_ids())
    )
  )
);
```

#### سياسة الرفع (INSERT)
```sql
CREATE POLICY "Team members can upload assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-assets'
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.role IN ('admin', 'manager', 'writer', 'designer')
  )
);
```

#### سياسة الحذف (DELETE)
```sql
CREATE POLICY "Team members can delete assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-assets'
  AND EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.role IN ('admin', 'manager', 'writer', 'designer')
  )
);
```

---

## 4. من يستطيع رفع الملفات؟

### الصلاحيات المُعرّفة
| الدور | رفع | حذف | عرض |
|-------|-----|-----|-----|
| Admin | ✅ | ✅ | ✅ الكل |
| Manager | ✅ | ✅ | ✅ الكل |
| Writer | ✅ | ✅ | 🟡 عملاؤه |
| Designer | ✅ | ✅ | 🟡 عملاؤه |
| Client | ❌ | ❌ | 🟡 عميله فقط |

### الكود في Server Action
```typescript
// lib/actions.ts - uploadAsset
export async function uploadAsset(postId: string, file: File) {
  const supabase = await createClient()
  
  // رفع الملف
  const fileName = `${postId}/${Date.now()}-${file.name}`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("post-assets")
    .upload(fileName, file)

  if (uploadError) {
    return { error: uploadError.message }
  }

  // الحصول على URL
  const { data: { publicUrl } } = supabase.storage
    .from("post-assets")
    .getPublicUrl(fileName)

  // حفظ في جدول assets
  const { error: dbError } = await supabase.from("assets").insert({
    post_id: postId,
    type: file.type.startsWith("image/") ? "image" : 
          file.type.startsWith("video/") ? "video" : "file",
    url: publicUrl,
    name: file.name,
  })

  return { data: { url: publicUrl } }
}
```

---

## 5. هل الـ Assets مربوطة بعميل معين؟

### الربط الحالي
```
assets.post_id → posts.client_id
```

### المشكلة
- جدول `assets` لا يحتوي على `client_id` مباشرة
- الربط يتم عبر `posts`
- هذا يعني أن RLS على assets يحتاج JOIN

### الحل المُطبق في RLS
```sql
-- التحقق من client_id عبر posts
EXISTS (
  SELECT 1 FROM assets a
  JOIN posts p ON a.post_id = p.id
  WHERE a.url LIKE '%' || storage.objects.name || '%'
  AND p.client_id IN (SELECT get_user_client_ids())
)
```

---

## 6. مخاطر تسريب روابط الملفات

### السيناريو الخطر
```
1. عميل A يرفع صورة
2. URL: https://xxx.supabase.co/storage/v1/object/public/post-assets/abc.jpg
3. عميل B يحصل على هذا URL (عبر inspect أو تخمين)
4. إذا كان bucket public → يمكنه الوصول
```

### الحلول

#### الحل 1: جعل Bucket Private (مُوصى به)
```sql
UPDATE storage.buckets SET public = false WHERE id = 'post-assets';
```
ثم استخدام Signed URLs:
```typescript
const { data } = await supabase.storage
  .from("post-assets")
  .createSignedUrl(fileName, 3600) // صالح لساعة
```

#### الحل 2: استخدام مسارات عشوائية
```typescript
const fileName = `${postId}/${crypto.randomUUID()}-${file.name}`
```

#### الحل 3: RLS على storage.objects
```sql
-- تم تطبيقه في scripts/010_storage_security.sql
```

---

## 7. خطوات التحقق والإصلاح

### الخطوة 1: التحقق من حالة Bucket
```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'post-assets';
```

### الخطوة 2: جعله Private إذا كان Public
```sql
UPDATE storage.buckets SET public = false WHERE id = 'post-assets';
```

### الخطوة 3: تطبيق سياسات RLS
```bash
# تشغيل السكربت
psql -f scripts/010_storage_security.sql
```

### الخطوة 4: اختبار الوصول
```bash
# محاولة الوصول بدون تسجيل دخول
curl https://[project].supabase.co/storage/v1/object/public/post-assets/[file]
# يجب أن يُرجع 403 Forbidden
```

### الخطوة 5: اختبار العزل
```
1. تسجيل دخول كـ Client A
2. رفع صورة
3. تسجيل دخول كـ Client B
4. محاولة الوصول لصورة Client A
5. يجب أن يفشل
```

---

## 8. هيكل الملفات في Storage

### الهيكل الحالي
```
post-assets/
├── [post_id]/
│   ├── [timestamp]-[filename].jpg
│   ├── [timestamp]-[filename].mp4
│   └── ...
└── ...
```

### مثال
```
post-assets/
├── 550e8400-e29b-41d4-a716-446655440000/
│   ├── 1706270400000-design-v1.jpg
│   ├── 1706270500000-design-v2.jpg
│   └── 1706270600000-video.mp4
└── 660e8400-e29b-41d4-a716-446655440001/
    └── 1706271000000-banner.png
```

---

## 9. جدول assets في قاعدة البيانات

### Schema
```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES post_variants(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'link', 'file')),
  url TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS على assets
```sql
-- SELECT: حسب client_id عبر posts
CREATE POLICY "assets_select" ON assets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_id 
    AND p.client_id IN (SELECT get_user_client_ids())
  )
);

-- INSERT: للفريق فقط
CREATE POLICY "assets_insert" ON assets FOR INSERT WITH CHECK (
  NOT is_client_user()
  AND EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_id 
    AND p.client_id IN (SELECT get_user_client_ids())
  )
);

-- DELETE: للفريق فقط
CREATE POLICY "assets_delete" ON assets FOR DELETE USING (
  NOT is_client_user()
  AND EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_id 
    AND p.client_id IN (SELECT get_user_client_ids())
  )
);
```

---

## 10. ملخص الحالة

| الجانب | الحالة | الملاحظة |
|--------|--------|----------|
| **Bucket exists** | ✅ | `post-assets` |
| **Bucket private** | 🚨 يحتاج تحقق | قد يكون public |
| **Storage RLS policies** | 🟡 مكتوبة | تحتاج تطبيق |
| **assets table RLS** | 🟡 مكتوبة | تحتاج تطبيق |
| **File naming** | ✅ | `[postId]/[timestamp]-[name]` |
| **Signed URLs** | ❌ غير مُستخدم | يُستخدم public URL |

---

## 11. التوصيات

### P0 - عاجل جداً
1. **التحقق من أن bucket private**
2. **تطبيق سياسات storage RLS**
3. **اختبار العزل بين العملاء**

### P1 - مهم
1. استخدام **Signed URLs** بدلاً من public URLs
2. إضافة **file size limits**
3. إضافة **file type validation**

### P2 - تحسينات
1. **Image optimization** (resize, compress)
2. **CDN** للملفات
3. **Virus scanning** للملفات المرفوعة
