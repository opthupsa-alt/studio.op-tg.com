# 04 - فجوات المصادقة والصلاحيات (Auth & RBAC Gaps)

## تاريخ التدقيق: 2026-01-26

---

## 1. ملخص تنفيذي

| الفئة | الحالة | المخاطر |
|-------|--------|---------|
| المصادقة (Auth) | ✅ جيد | منخفضة |
| حماية المسارات | ⚠️ جزئي | متوسطة |
| RLS Policies | ⚠️ جزئي | عالية |
| Role Checks في الكود | ❌ ضعيف | عالية |
| Tenant Isolation | ❌ ضعيف | حرجة |

---

## 2. حالة المصادقة (Authentication)

### 2.1 ما يعمل ✅

| العنصر | الملف | الحالة |
|--------|-------|--------|
| Supabase Auth | `lib/supabase/` | ✅ مُعد بشكل صحيح |
| Login Page | `app/auth/login/page.tsx` | ✅ يعمل |
| Sign Up Page | `app/auth/sign-up/page.tsx` | ✅ يعمل |
| Session Management | `lib/supabase/proxy.ts` | ✅ يعمل |
| Middleware Protection | `middleware.ts` | ✅ يعمل |

### 2.2 تدفق المصادقة الحالي

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Request   │────▶│  Middleware │────▶│   Page      │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ auth.getUser│
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
        ┌──────────┐             ┌──────────┐
        │ No User  │             │ Has User │
        └────┬─────┘             └────┬─────┘
             │                        │
             ▼                        ▼
      ┌────────────┐          ┌────────────┐
      │ Redirect   │          │ Continue   │
      │ to /login  │          │ to Page    │
      └────────────┘          └────────────┘
```

---

## 3. فجوات حماية المسارات ⚠️

### 3.1 المشكلة: لا يوجد تحقق من الدور في Middleware

**الكود الحالي (`lib/supabase/proxy.ts`):**
```typescript
// يتحقق فقط من وجود user، لا يتحقق من الدور
if (isProtectedRoute && !user) {
  const url = request.nextUrl.clone()
  url.pathname = '/auth/login'
  return NextResponse.redirect(url)
}
```

**المشكلة:**
- أي مستخدم مسجل يمكنه الوصول لأي صفحة
- العميل يمكنه الوصول لـ `/team` و `/clients`
- لا يوجد فصل بين بوابات المستخدمين

### 3.2 الحل المطلوب

```typescript
// جلب دور المستخدم
const { data: teamMember } = await supabase
  .from('team_members')
  .select('role, client_id')
  .eq('user_id', user.id)
  .single()

// تحديد المسارات حسب الدور
const adminOnlyRoutes = ['/team', '/clients', '/settings']
const clientRoutes = ['/client-portal']

if (teamMember?.role === 'client') {
  // العميل يُوجه لبوابته فقط
  if (!request.nextUrl.pathname.startsWith('/client-portal') && 
      !request.nextUrl.pathname.startsWith('/share')) {
    return NextResponse.redirect(new URL('/client-portal', request.url))
  }
}

if (adminOnlyRoutes.some(r => request.nextUrl.pathname.startsWith(r))) {
  if (!['admin', 'manager'].includes(teamMember?.role || '')) {
    return NextResponse.redirect(new URL('/', request.url))
  }
}
```

---

## 4. فجوات RLS Policies ⚠️

### 4.1 مشكلة: Writer/Designer يرون كل العملاء

**Policy الحالي (`scripts/005_rls_policies.sql`):**
```sql
CREATE POLICY "posts_select" ON posts
  FOR SELECT USING (
    get_user_role() IN ('admin', 'manager', 'writer', 'designer')
    OR client_id = get_user_client_id()
  );
```

**المشكلة:**
- `writer` و `designer` يرون **كل** البوستات
- لا يوجد تحقق من الإسناد (`assigned_writer`, `assigned_designer`)
- لا يوجد تحقق من ربط العضو بالعميل

**الحل المطلوب:**
```sql
CREATE POLICY "posts_select" ON posts
  FOR SELECT USING (
    -- Admin/Manager يرون الكل
    get_user_role() IN ('admin', 'manager')
    -- Writer/Designer يرون فقط العملاء المسندين لهم
    OR (
      get_user_role() IN ('writer', 'designer')
      AND EXISTS (
        SELECT 1 FROM team_member_clients tmc
        WHERE tmc.team_member_id = get_user_team_member_id()
        AND tmc.client_id = posts.client_id
      )
    )
    -- Client يرى فقط بوستاته
    OR (
      get_user_role() = 'client'
      AND client_id = get_user_client_id()
    )
  );
```

### 4.2 مشكلة: Approvals يمكن إنشاؤها من غير العميل

**Policy الحالي:**
```sql
CREATE POLICY "approvals_insert" ON approvals
  FOR INSERT WITH CHECK (
    get_user_role() = 'client'
    AND EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = approvals.post_id 
      AND posts.client_id = get_user_client_id()
      AND posts.status = 'client_review'
    )
  );
```

**المشكلة:** جيد نظرياً، لكن في الكود (`lib/actions.ts`) يتم إنشاء approval من Server Action بدون تحقق:

```typescript
// lib/actions.ts - approvePost
const { error: approvalError } = await supabase
  .from("approvals")
  .upsert({
    post_id: id,
    status: "approved",
    note: feedback,
  }, { onConflict: "post_id" })
```

**الحل:** إضافة `client_user_id` وتحقق من الدور:
```typescript
const { data: { user } } = await supabase.auth.getUser()
const { data: teamMember } = await supabase
  .from('team_members')
  .select('role, client_id')
  .eq('user_id', user.id)
  .single()

// فقط العميل أو Admin يمكنه الموافقة
if (!['client', 'admin', 'manager'].includes(teamMember?.role)) {
  return { error: 'Unauthorized' }
}
```

### 4.3 مشكلة: Comments بدون تحقق من scope

**الكود الحالي (`lib/actions.ts`):**
```typescript
export async function addComment(postId: string, content: string, scope: "internal" | "client" = "internal") {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      comment: content,
      scope,
    })
    // ...
}
```

**المشكلة:**
- لا يتم تعيين `user_id`
- العميل يمكنه إرسال تعليق `internal` (نظرياً)

**الحل:**
```typescript
export async function addComment(postId: string, content: string, scope: "internal" | "client" = "internal") {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Unauthorized' }
  
  // جلب دور المستخدم
  const { data: teamMember } = await supabase
    .from('team_members')
    .select('role')
    .eq('user_id', user.id)
    .single()
  
  // العميل لا يمكنه إرسال تعليق internal
  if (teamMember?.role === 'client' && scope === 'internal') {
    return { error: 'Clients can only add client-scope comments' }
  }
  
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_id: user.id,  // إضافة user_id
      comment: content,
      scope,
    })
  // ...
}
```

---

## 5. فجوات Role Checks في الكود ❌

### 5.1 API Routes بدون تحقق من الدور

| الملف | المشكلة | الخطورة |
|-------|---------|---------|
| `api/posts/[id]/status/route.ts` | يستخدم `"admin"` ثابت | 🔴 عالية |
| `api/posts/[id]/date/route.ts` | لا يتحقق من الدور | 🔴 عالية |
| `api/posts/[id]/approve/route.ts` | لا يتحقق من أن المستخدم عميل | 🔴 عالية |

**الكود الحالي (`api/posts/[id]/status/route.ts`):**
```typescript
// Validate transition (using admin role for now - TODO: get actual user role)
const validation = validateStatusTransition(
  post.status as PostStatus,
  status as PostStatus,
  "admin",  // ❌ ثابت!
  post.locked || false
)
```

**الحل:**
```typescript
// جلب دور المستخدم الحقيقي
const { data: { user } } = await supabase.auth.getUser()
const { data: teamMember } = await supabase
  .from('team_members')
  .select('role')
  .eq('user_id', user?.id)
  .single()

const validation = validateStatusTransition(
  post.status as PostStatus,
  status as PostStatus,
  teamMember?.role || 'client',
  post.locked || false
)
```

### 5.2 Server Actions بدون تحقق

| الملف | الدالة | المشكلة |
|-------|--------|---------|
| `lib/actions.ts` | `createPost` | لا يتحقق من صلاحية الإنشاء |
| `lib/actions.ts` | `updatePost` | لا يتحقق من locked |
| `lib/actions.ts` | `deletePost` | لا يتحقق من الدور |
| `lib/actions.ts` | `approvePost` | لا يتحقق من أن المستخدم عميل |

---

## 6. فجوات Tenant Isolation ❌

### 6.1 المشكلة الرئيسية: لا يوجد client scope في الـ queries

**الكود الحالي (`lib/data.ts`):**
```typescript
export async function getPosts(): Promise<Post[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("posts")
    .select(`...`)
    .order("publish_date", { ascending: true })
  // ❌ لا يوجد filter بـ client_id
}
```

**المشكلة:**
- RLS يحمي على مستوى DB، لكن الكود لا يُظهر النية
- إذا تعطل RLS، كل البيانات ستظهر
- صعوبة في debugging

**الحل (Defense in Depth):**
```typescript
export async function getPosts(clientId?: string): Promise<Post[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from("posts")
    .select(`...`)
    .order("publish_date", { ascending: true })
  
  // إضافة filter إذا تم تحديد client
  if (clientId) {
    query = query.eq('client_id', clientId)
  }
  
  const { data, error } = await query
  // ...
}
```

### 6.2 Share Page بدون حماية

**الكود الحالي (`app/share/[clientId]/[year]/[month]/page.tsx`):**
```typescript
export default async function SharePage({ params, searchParams }: SharePageProps) {
  const { clientId, year, month } = await params
  const { password } = await searchParams  // ❌ غير مستخدم!
  
  // يجلب البيانات مباشرة بدون تحقق
  const data = await getShareData(clientId, yearNum, monthNum)
}
```

**المشكلة:**
- أي شخص يعرف الـ URL يمكنه رؤية خطة العميل
- لا يوجد password protection
- لا يوجد expiry للرابط

**الحل:**
1. إضافة `share_token` و `share_password` لجدول `plans`
2. التحقق من الـ token/password قبل عرض البيانات

---

## 7. جدول الثغرات والحلول

| # | الثغرة | الخطورة | الملف | الحل |
|---|--------|---------|-------|------|
| 1 | Middleware لا يتحقق من الدور | 🟡 متوسطة | `proxy.ts` | إضافة role check |
| 2 | Writer/Designer يرون كل العملاء | 🔴 عالية | RLS policies | إنشاء `team_member_clients` |
| 3 | API routes تستخدم دور ثابت | 🔴 عالية | `api/posts/*/route.ts` | جلب الدور الحقيقي |
| 4 | Server Actions بدون role check | 🔴 عالية | `lib/actions.ts` | إضافة تحقق |
| 5 | Comments بدون user_id | 🟡 متوسطة | `lib/actions.ts` | إضافة user_id |
| 6 | Share page بدون حماية | 🔴 عالية | `share/page.tsx` | إضافة token/password |
| 7 | لا يوجد Client Portal | 🔴 عالية | غير موجود | إنشاء بوابة العميل |

---

## 8. خطة الإصلاح المقترحة

### المرحلة 1: إصلاحات حرجة (يوم واحد)

1. **إنشاء `team_member_clients` table**
   ```sql
   CREATE TABLE team_member_clients (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     team_member_id UUID NOT NULL REFERENCES team_members(id),
     client_id UUID NOT NULL REFERENCES clients(id),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(team_member_id, client_id)
   );
   ```

2. **تحديث RLS policies**
   - تحديث `posts_select` للتحقق من `team_member_clients`
   - تحديث `plans_select` بنفس الطريقة

3. **إصلاح API routes**
   - جلب الدور الحقيقي بدلاً من `"admin"` الثابت

### المرحلة 2: إصلاحات مهمة (يومين)

4. **إضافة role check في Middleware**
   - توجيه العميل لبوابته
   - منع الوصول لصفحات الإدارة

5. **إصلاح Server Actions**
   - إضافة `user_id` للتعليقات
   - التحقق من الدور قبل العمليات

6. **إنشاء Client Portal**
   - صفحة `/client-portal`
   - عرض خطة العميل فقط
   - إمكانية الموافقة/الرفض

### المرحلة 3: تحسينات (يوم واحد)

7. **حماية Share page**
   - إضافة `share_token` للـ plans
   - التحقق من الـ token

8. **Audit logging** (اختياري)
   - تسجيل العمليات الحساسة

---

## 9. اختبارات الأمان المطلوبة

### Test Cases

| # | الاختبار | النتيجة المتوقعة |
|---|----------|------------------|
| 1 | Writer يحاول رؤية بوستات عميل غير مسند له | ❌ لا يرى شيء |
| 2 | Client يحاول الوصول لـ `/team` | ❌ توجيه لبوابته |
| 3 | Client يحاول إرسال تعليق internal | ❌ خطأ |
| 4 | مستخدم غير مسجل يحاول الوصول لـ share page بدون token | ❌ خطأ |
| 5 | Writer يحاول تعديل بوست مقفل | ❌ خطأ |
| 6 | Client يحاول تغيير حالة بوست لـ "posted" | ❌ خطأ |

### كيفية الاختبار

```bash
# 1. إنشاء مستخدمين بأدوار مختلفة
# 2. تسجيل الدخول بكل دور
# 3. محاولة الوصول للموارد المحظورة
# 4. التحقق من الاستجابة
```
