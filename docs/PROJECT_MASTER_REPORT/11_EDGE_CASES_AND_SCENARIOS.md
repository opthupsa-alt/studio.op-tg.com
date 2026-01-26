# 11 - Edge Cases & Scenarios
## سيناريوهات الحالات الحدية

**تاريخ التقرير:** 2026-01-26

---

## 1. مستخدم مرتبط بأكثر من عميل

### السيناريو
```
Writer "أحمد" مسند له:
- عميل A (شركة الأمل)
- عميل B (مؤسسة النور)
```

### الحالة الحالية
| الجانب | الحالة | الملاحظة |
|--------|--------|----------|
| **جدول team_member_clients** | ✅ موجود | يدعم M:N |
| **RLS get_user_client_ids()** | ✅ مكتوب | يجلب كل العملاء المخصصين |
| **UI filtering** | 🟡 جزئي | يعتمد على RLS |

### كيفية الاختبار
```sql
-- 1. إنشاء تخصيصات
INSERT INTO team_member_clients (team_member_id, client_id) VALUES
  ('ahmed-id', 'client-a-id'),
  ('ahmed-id', 'client-b-id');

-- 2. تسجيل دخول كـ أحمد
-- 3. التحقق من ظهور بوستات العميلين
-- 4. التحقق من عدم ظهور بوستات عميل C
```

### المخاطر
- 🟡 إذا لم يُطبق RLS، قد يرى أحمد كل العملاء

---

## 2. عميل بلا بوستات لهذا الشهر (Empty State)

### السيناريو
```
عميل "شركة الأمل" ليس لديه أي بوستات في يناير 2026
```

### الحالة الحالية
| الجانب | الحالة | الملاحظة |
|--------|--------|----------|
| **Calendar View** | ✅ يعرض | تقويم فارغ |
| **Grid View** | ✅ يعرض | رسالة "لا توجد بوستات" |
| **Kanban View** | ✅ يعرض | أعمدة فارغة |
| **Client Portal** | ✅ يعرض | رسالة "لا توجد بوستات للمراجعة" |
| **Dashboard Stats** | ✅ يعرض | أرقام صفرية |

### كيفية الاختبار
```
1. إنشاء عميل جديد بدون بوستات
2. زيارة كل view
3. التحقق من عدم وجود أخطاء
4. التحقق من ظهور empty state مناسب
```

### الكود
```typescript
// components/grid-view.tsx
{posts.length === 0 && (
  <div className="text-center text-muted-foreground py-12">
    لا توجد بوستات في هذه الفترة
  </div>
)}
```

---

## 3. بوست على أكثر من منصة مع Variants مختلفة

### السيناريو
```
بوست "عرض رمضان":
- Instagram: caption طويل + 10 hashtags
- TikTok: caption قصير + 5 hashtags
- X: caption مختصر جداً
```

### الحالة الحالية
| الجانب | الحالة | الملاحظة |
|--------|--------|----------|
| **post_platforms** | ✅ يدعم | M:N relationship |
| **post_variants** | ✅ يدعم | variant لكل منصة |
| **UI لإنشاء variants** | 🟡 محدود | يحتاج تحسين |
| **UI لعرض variants** | 🟡 محدود | يعرض لكن التفاعل محدود |

### كيفية الاختبار
```sql
-- 1. إنشاء بوست
INSERT INTO posts (...) VALUES (...) RETURNING id;

-- 2. إضافة منصات
INSERT INTO post_platforms (post_id, platform_id) VALUES
  ('post-id', 'instagram-id'),
  ('post-id', 'tiktok-id'),
  ('post-id', 'x-id');

-- 3. إنشاء variants
INSERT INTO post_variants (post_id, platform_id, caption, hashtags) VALUES
  ('post-id', 'instagram-id', 'caption طويل...', '#رمضان #عروض ...'),
  ('post-id', 'tiktok-id', 'caption قصير', '#رمضان'),
  ('post-id', 'x-id', 'عرض رمضان 🌙', '');
```

### المخاطر
- 🟡 UI لا يسمح بتعديل كل variant بسهولة

---

## 4. حذف بوست له assets وتعليقات وموافقة

### السيناريو
```
بوست "حملة الصيف" له:
- 3 صور
- 5 تعليقات
- سجل موافقة
```

### الحالة الحالية
| الجانب | الحالة | الملاحظة |
|--------|--------|----------|
| **CASCADE delete** | ✅ مُفعّل | كل الجداول المرتبطة |
| **Storage cleanup** | ❌ غير مُفعّل | الملفات تبقى في Storage |

### كيفية الاختبار
```sql
-- 1. إنشاء بوست مع assets وتعليقات
-- 2. حذف البوست
DELETE FROM posts WHERE id = 'post-id';

-- 3. التحقق من حذف المرتبطات
SELECT * FROM assets WHERE post_id = 'post-id'; -- يجب أن يكون فارغ
SELECT * FROM comments WHERE post_id = 'post-id'; -- يجب أن يكون فارغ
SELECT * FROM approvals WHERE post_id = 'post-id'; -- يجب أن يكون فارغ

-- 4. التحقق من Storage (يدوياً)
-- الملفات قد تبقى في bucket
```

### المخاطر
- 🚨 تراكم ملفات يتيمة في Storage
- **الحل:** إضافة cleanup job أو trigger

---

## 5. تغيير الشهر والرجوع للشهر السابق

### السيناريو
```
المستخدم في يناير 2026
→ ينتقل لفبراير 2026
→ يرجع ليناير 2026
```

### الحالة الحالية
| الجانب | الحالة | الملاحظة |
|--------|--------|----------|
| **State management** | ✅ يعمل | useState للشهر |
| **Data fetching** | ✅ يعمل | يجلب بيانات الشهر |
| **URL sync** | 🟡 جزئي | لا يحفظ في URL |
| **Performance** | ✅ جيد | لا يوجد تأخير ملحوظ |

### كيفية الاختبار
```
1. فتح التقويم
2. الانتقال للشهر التالي
3. الرجوع للشهر السابق
4. التحقق من ظهور البيانات الصحيحة
5. تحديث الصفحة - هل يحافظ على الشهر؟
```

### المخاطر
- 🟡 تحديث الصفحة يُرجع للشهر الحالي

---

## 6. مستخدم يحاول فتح postId من عميل آخر

### السيناريو
```
Client A يحاول الوصول لـ:
/api/posts/[post_id_of_client_b]
```

### الحالة الحالية
| الجانب | الحالة | الملاحظة |
|--------|--------|----------|
| **RLS on posts** | 🟡 مكتوب | يحتاج تطبيق |
| **Server Action check** | ✅ موجود | في approvePost/rejectPost |
| **UI protection** | ✅ موجود | لا يظهر البوست |

### كيفية الاختبار
```typescript
// 1. تسجيل دخول كـ Client A
// 2. محاولة approve بوست Client B
const result = await approvePost('client-b-post-id')
// Expected: { error: "You can only approve your own client's posts" }
```

### الكود
```typescript
// lib/actions.ts
if (teamMember.role === "client" && teamMember.client_id) {
  const { data: post } = await supabase
    .from("posts")
    .select("client_id")
    .eq("id", id)
    .single()
  
  if (!post || post.client_id !== teamMember.client_id) {
    return { error: "You can only approve your own client's posts" }
  }
}
```

---

## 7. Approve ثم محاولة تعديل من Writer

### السيناريو
```
1. بوست في حالة client_review
2. العميل يوافق → approved + locked
3. Writer يحاول تعديل العنوان
```

### الحالة الحالية
| الجانب | الحالة | الملاحظة |
|--------|--------|----------|
| **Lock on approve** | ✅ مُفعّل | `locked = true` |
| **Server Action check** | ✅ موجود | يفحص locked |
| **UI disable** | 🟡 جزئي | يحتاج تحسين |

### كيفية الاختبار
```typescript
// 1. موافقة على البوست
await approvePost('post-id')

// 2. محاولة تعديل كـ Writer
const result = await updatePost('post-id', { title: 'عنوان جديد' })
// Expected: { error: "This post is locked. Only admin/manager can modify it." }
```

### الكود
```typescript
// lib/actions.ts - updatePost
if (existingPost?.locked) {
  if (!["admin", "manager"].includes(teamMember.role)) {
    return { error: "This post is locked. Only admin/manager can modify it." }
  }
}
```

---

## 8. Reject مع سبب ثم إعادة إرسال للمراجعة

### السيناريو
```
1. العميل يرفض البوست: "الصورة غير واضحة"
2. Designer يعدل الصورة
3. Manager يُعيد إرسال للمراجعة
4. العميل يوافق
```

### الحالة الحالية
| الجانب | الحالة | الملاحظة |
|--------|--------|----------|
| **Reject unlocks** | ✅ مُفعّل | `locked = false` |
| **Rejection note saved** | ✅ مُفعّل | في approvals table |
| **Re-submit flow** | ✅ يعمل | draft → ... → client_review |
| **History preserved** | ✅ يعمل | سجلات متعددة في approvals |

### كيفية الاختبار
```sql
-- 1. رفض البوست
-- 2. التحقق من سجل الرفض
SELECT * FROM approvals WHERE post_id = 'post-id' ORDER BY created_at;
-- يجب أن يظهر: status='rejected', note='الصورة غير واضحة'

-- 3. تعديل وإعادة إرسال
-- 4. موافقة
-- 5. التحقق من السجل
SELECT * FROM approvals WHERE post_id = 'post-id' ORDER BY created_at;
-- يجب أن يظهر سجلين: rejected ثم approved
```

---

## 9. Performance عند 300+ بوست في الشهر

### السيناريو
```
عميل كبير لديه 300 بوست في شهر واحد
```

### الحالة الحالية
| الجانب | الحالة | الملاحظة |
|--------|--------|----------|
| **Database indexes** | ✅ موجودة | على publish_date, client_id, status |
| **Pagination** | ❌ غير موجود | يجلب كل البوستات |
| **Lazy loading** | ❌ غير موجود | يحمل كل شيء مرة واحدة |
| **Virtual scrolling** | ❌ غير موجود | - |

### كيفية الاختبار
```sql
-- 1. إنشاء 300 بوست
INSERT INTO posts (plan_id, client_id, title, publish_date, status)
SELECT 
  'plan-id',
  'client-id',
  'بوست ' || generate_series,
  '2026-01-' || (1 + (generate_series % 28))::text,
  'idea'
FROM generate_series(1, 300);

-- 2. قياس وقت الاستجابة
EXPLAIN ANALYZE SELECT * FROM posts WHERE client_id = 'client-id' AND ...;
```

### المخاطر
- 🟡 بطء في التحميل
- 🟡 استهلاك ذاكرة عالي

### الحلول المقترحة
1. **Pagination** - تحميل 50 بوست في كل مرة
2. **Virtual scrolling** - react-window أو react-virtualized
3. **Lazy loading** - تحميل التفاصيل عند الطلب

---

## 10. ملخص السيناريوهات

| السيناريو | الحالة | الأولوية |
|-----------|--------|----------|
| مستخدم بعدة عملاء | 🟡 يحتاج تحقق RLS | P1 |
| Empty state | ✅ يعمل | - |
| Multi-platform variants | 🟡 UI محدود | P2 |
| Delete with relations | 🟡 Storage cleanup مفقود | P2 |
| Month navigation | ✅ يعمل | - |
| Cross-client access | ✅ محمي | - |
| Locked post edit | ✅ محمي | - |
| Reject & resubmit | ✅ يعمل | - |
| High volume (300+) | 🟡 يحتاج pagination | P2 |

---

## 11. اختبارات مطلوبة

### Unit Tests
```typescript
describe('Workflow', () => {
  it('should lock post on approve', async () => {})
  it('should unlock post on reject', async () => {})
  it('should prevent writer from editing locked post', async () => {})
})
```

### Integration Tests
```typescript
describe('Tenant Isolation', () => {
  it('should prevent client A from seeing client B posts', async () => {})
  it('should prevent client A from approving client B posts', async () => {})
})
```

### E2E Tests
```typescript
describe('Full Workflow', () => {
  it('should complete idea → posted flow', async () => {})
  it('should handle reject and resubmit', async () => {})
})
```
