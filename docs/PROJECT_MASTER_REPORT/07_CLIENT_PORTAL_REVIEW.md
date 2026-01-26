# 07 - Client Portal Review
## مراجعة بوابة العميل

**تاريخ التقرير:** 2026-01-26

---

## 1. ما الذي يستطيع العميل فعله فعلياً

### الصلاحيات المُفعّلة ✅

| الإجراء | الملف | كيفية الاختبار |
|---------|-------|----------------|
| **عرض بوستاته** | `components/client-portal-content.tsx` | تسجيل دخول كعميل → `/client-portal` |
| **الموافقة على بوست** | `lib/actions.ts:approvePost` | زر "موافقة" على بوست في `client_review` |
| **رفض بوست مع سبب** | `lib/actions.ts:rejectPost` | زر "رفض" مع كتابة السبب |
| **إضافة تعليق** | `lib/actions.ts:addComment` | كتابة تعليق على البوست |
| **عرض التعليقات العامة** | `components/client-portal-content.tsx` | التعليقات بـ `scope='client'` |
| **عرض الملفات/التصاميم** | `components/client-portal-content.tsx` | عرض الصور والفيديوهات |
| **تبديل الشهر** | `components/client-portal-content.tsx` | أزرار التنقل بين الأشهر |

---

## 2. ما الذي لا يستطيع العميل فعله

### القيود المُطبّقة ❌

| الإجراء | كيف يُمنع | الملف |
|---------|----------|-------|
| **تعديل البوست** | Server Action check | `lib/actions.ts:updatePost` - `if (teamMember.role === "client") return error` |
| **حذف البوست** | Server Action check | `lib/actions.ts:deletePost` - implicit via RLS |
| **إنشاء بوست** | Server Action check | `lib/actions.ts:createPost` - implicit via RLS |
| **رفع ملفات** | Server Action check | `lib/actions.ts:uploadAsset` - implicit via RLS |
| **تغيير الحالة** | Workflow rules | `lib/workflow.ts` - client can only approve/reject |
| **عرض التعليقات الداخلية** | Scope filter | `scope='internal'` لا تظهر للعميل |
| **الوصول للوحة التحكم** | Sidebar filter | `components/app-sidebar.tsx` - client sees only portal |
| **إدارة العملاء/الفريق** | Route protection | Middleware + Sidebar |

---

## 3. اختبارات منع التعديل

### اختبار 1: محاولة تعديل عبر Server Action
```typescript
// تسجيل دخول كعميل ثم استدعاء:
const result = await updatePost(postId, { title: "hacked" })
// النتيجة المتوقعة: { error: "Clients cannot update posts" }
```

**الملف:** `lib/actions.ts` السطر 91-93
```typescript
if (teamMember.role === "client") {
  return { error: "Clients cannot update posts" }
}
```

### اختبار 2: محاولة تعديل عبر API مباشر
```bash
# إذا كان هناك API route للتعديل
curl -X PATCH /api/posts/[id] -d '{"title":"hacked"}' -H "Authorization: Bearer [client_token]"
# يجب أن يفشل
```

### اختبار 3: محاولة تعديل عبر Supabase مباشر
```sql
-- إذا كان RLS مُفعّل بشكل صحيح:
UPDATE posts SET title = 'hacked' WHERE id = 'post_id';
-- يجب أن يُرجع 0 rows affected للعميل
```

---

## 4. هل يستطيع العميل رؤية فقط بياناته؟

### التحقق في الكود

#### جلب البوستات
```typescript
// components/client-portal-content.tsx
// يجلب البوستات عبر Server Component الذي يستخدم RLS
const posts = await getPostsForClient(clientId)
```

#### Server Action Check
```typescript
// lib/actions.ts - approvePost
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

### اختبار العزل
```
1. إنشاء عميلين: Client A, Client B
2. إنشاء بوست لكل عميل
3. تسجيل دخول كـ Client A
4. التحقق من عدم ظهور بوست Client B
5. محاولة الوصول لـ /api/posts/[client_b_post_id]
6. يجب أن يفشل
```

---

## 5. هل يمكن للعميل الوصول لخطة عميل آخر؟

### الحماية الحالية

| الطبقة | الحماية | الحالة |
|--------|---------|--------|
| **UI** | لا يظهر dropdown لاختيار عميل آخر | ✅ |
| **Server Action** | فحص `client_id` قبل العملية | ✅ |
| **RLS** | `client_id IN (SELECT get_user_client_ids())` | 🟡 يحتاج تحقق |
| **URL manipulation** | `/share/[clientId]/...` قد يكون مكشوف | 🚨 خطر |

### اختبار الوصول عبر URL
```
1. تسجيل دخول كـ Client A (client_id = 'aaa')
2. محاولة الوصول لـ /client-portal?client_id=bbb
3. يجب أن يُعيد توجيه أو يعرض خطأ
```

### 🚨 ثغرة محتملة: Share Link
```
/share/[clientId]/[year]/[month]
```
هذا الرابط **عام** ولا يتطلب تسجيل دخول. أي شخص يعرف الـ clientId يمكنه رؤية الخطة.

**الحل المقترح:**
- إضافة token عشوائي للرابط
- أو جعله يتطلب تسجيل دخول

---

## 6. ملاحظات UX للعميل

### الإيجابيات ✅
| النقطة | التفاصيل |
|--------|----------|
| **واجهة بسيطة** | العميل يرى فقط ما يحتاجه |
| **تصفية بالشهر** | يمكن التنقل بين الأشهر بسهولة |
| **عرض واضح للحالة** | badges ملونة لكل حالة |
| **موافقة/رفض سهل** | أزرار واضحة مع modal للتأكيد |
| **RTL Support** | الواجهة تدعم العربية |

### السلبيات / التحسينات المطلوبة 🟡
| النقطة | التفاصيل | الأولوية |
|--------|----------|----------|
| **لا يوجد إشعار بريدي** | العميل لا يعرف متى يُرسل له بوست للمراجعة | P2 |
| **لا يوجد تصدير** | لا يمكن تصدير الخطة كـ PDF | P2 |
| **لا يوجد تعليق على variant** | التعليق على البوست ككل فقط | P2 |
| **لا يوجد bulk approve** | موافقة على بوست واحد في كل مرة | P2 |
| **Empty state** | رسالة عند عدم وجود بوستات | ✅ موجود |

---

## 7. الكود المصدري الرئيسي

### client-portal-content.tsx
```typescript
// المكون الرئيسي لبوابة العميل
export function ClientPortalContent({ 
  client, 
  posts, 
  currentUser 
}: ClientPortalContentProps) {
  // فلترة البوستات حسب الشهر
  const filteredPosts = posts.filter(post => {
    const postDate = new Date(post.publish_date)
    return postDate.getMonth() === selectedMonth.getMonth() &&
           postDate.getFullYear() === selectedMonth.getFullYear()
  })
  
  // عرض البوستات مع أزرار الموافقة/الرفض
  return (
    <div>
      {filteredPosts.map(post => (
        <PostCard 
          key={post.id}
          post={post}
          onApprove={() => handleApprove(post.id)}
          onReject={() => handleReject(post.id)}
          canApprove={post.status === 'client_review'}
        />
      ))}
    </div>
  )
}
```

### approvePost Action
```typescript
export async function approvePost(id: string, feedback?: string) {
  // 1. التحقق من المستخدم
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // 2. جلب team_member
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("id, role, client_id")
    .eq("user_id", user.id)
    .single()

  // 3. التحقق من الصلاحية
  if (!["admin", "manager", "client"].includes(teamMember.role)) {
    return { error: "You don't have permission to approve posts" }
  }

  // 4. التحقق من ملكية البوست (للعميل)
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

  // 5. تحديث البوست
  await supabase
    .from("posts")
    .update({ status: "approved", locked: true })
    .eq("id", id)

  // 6. إنشاء سجل الموافقة
  await supabase.from("approvals").upsert({
    post_id: id,
    approver_id: teamMember.id,
    status: "approved",
    note: feedback,
  })

  return { success: true }
}
```

---

## 8. ملخص الأمان

| الجانب | الحالة | الملاحظة |
|--------|--------|----------|
| **منع التعديل** | ✅ | Server Action check |
| **منع الحذف** | ✅ | RLS + no UI |
| **عزل البيانات** | 🟡 | يعتمد على RLS - يحتاج تحقق |
| **Share link** | 🚨 | عام بدون حماية |
| **Session security** | ✅ | Supabase Auth |
| **CSRF** | ✅ | Server Actions محمية |

---

## 9. التوصيات

### P0 - عاجل
1. **تفعيل RLS** والتحقق من عمله
2. **حماية Share link** بـ token أو تسجيل دخول

### P1 - مهم
1. إضافة **logging** لعمليات الموافقة/الرفض
2. إضافة **rate limiting** لمنع spam

### P2 - تحسينات
1. إشعارات بريدية للعميل
2. تصدير الخطة كـ PDF
3. Bulk approve
