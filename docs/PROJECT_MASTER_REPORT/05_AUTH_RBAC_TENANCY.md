# 05 - Auth, RBAC & Tenancy
## المصادقة والصلاحيات وعزل البيانات

**تاريخ التقرير:** 2026-01-26

---

## 1. نظام المصادقة (Authentication)

### التقنية المستخدمة
- **Supabase Auth** مع Email/Password
- **Session Management** عبر Supabase client

### تدفق تسجيل الدخول
```
1. المستخدم يدخل البريد وكلمة المرور في /auth/login
2. supabase.auth.signInWithPassword()
3. Supabase يتحقق ويُرجع session
4. Middleware يتحقق من الـ session
5. إذا صالح → يسمح بالوصول
6. إذا غير صالح → يُعيد توجيه لـ /auth/login
```

### الملفات المعنية
| الملف | الوظيفة |
|-------|---------|
| `app/auth/login/page.tsx` | صفحة تسجيل الدخول |
| `app/auth/sign-up/page.tsx` | صفحة التسجيل |
| `lib/supabase/client.ts` | Supabase client للـ browser |
| `lib/supabase/server.ts` | Supabase client للـ server |
| `middleware.ts` | التحقق من الـ session |

### إنشاء مستخدم جديد
```typescript
// lib/actions.ts - createTeamMemberWithAuth
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: data.email,
  password: data.password,
  options: {
    data: {
      full_name: data.full_name,
      role: data.role,
    },
    emailRedirectTo: undefined,  // تفعيل فوري بدون تأكيد البريد
  }
})
```

---

## 2. استخراج الدور (Role Extraction)

### كيف يتم تحديد دور المستخدم
```typescript
// من lib/actions.ts
const { data: { user } } = await supabase.auth.getUser()
const { data: teamMember } = await supabase
  .from("team_members")
  .select("id, role, client_id")
  .eq("user_id", user.id)
  .single()

// teamMember.role = 'admin' | 'manager' | 'writer' | 'designer' | 'client'
```

### جدول الأدوار
| الدور | الوصف | client_id |
|-------|-------|-----------|
| `admin` | مدير النظام | NULL |
| `manager` | مشرف | NULL |
| `writer` | كاتب محتوى | NULL |
| `designer` | مصمم | NULL |
| `client` | عميل | مطلوب (FK to clients) |

---

## 3. تحديد client_id للمستخدم

### للعملاء (role = 'client')
```sql
-- client_id موجود مباشرة في team_members
SELECT client_id FROM team_members WHERE user_id = auth.uid() AND role = 'client'
```

### لأعضاء الفريق (writer/designer)
```sql
-- عبر جدول team_member_clients
SELECT client_id FROM team_member_clients 
WHERE team_member_id = (SELECT id FROM team_members WHERE user_id = auth.uid())
```

### للمدير والمشرف (admin/manager)
```sql
-- يمكنهم الوصول لجميع العملاء
SELECT id FROM clients
```

---

## 4. منع الوصول لبيانات عميل آخر

### الآلية المستخدمة
1. **RLS Policies** على مستوى قاعدة البيانات
2. **Server-side checks** في Server Actions
3. **Client-side filtering** في الواجهة

### مثال Server Action Check
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

---

## 5. جدول سياسات RLS

### الحالة الحالية: 🟡 مكتوبة لكن تحتاج تطبيق فعلي

| Table | RLS Enabled? | Policy Names | Who Can Read | Who Can Write | Risks |
|-------|--------------|--------------|--------------|---------------|-------|
| **platforms** | ✅ Yes | `platforms_select_all` | الجميع | Admin فقط | ✅ آمن |
| **clients** | ✅ Yes | `clients_select`, `clients_insert`, `clients_update`, `clients_delete` | Admin/Manager: الكل, Client: عميله فقط, Writer/Designer: المخصصين | Admin/Manager | 🟡 يحتاج تحقق |
| **team_members** | ✅ Yes | `team_members_select`, `team_members_insert`, `team_members_update`, `team_members_delete` | Admin/Manager: الكل, Others: أنفسهم | Admin/Manager | 🟡 يحتاج تحقق |
| **plans** | ✅ Yes | `plans_select`, `plans_insert`, `plans_update`, `plans_delete` | حسب client_id | Admin/Manager | 🟡 يحتاج تحقق |
| **posts** | ✅ Yes | `posts_select`, `posts_insert`, `posts_update`, `posts_delete` | حسب client_id | حسب الدور + locked | 🟡 يحتاج تحقق |
| **post_platforms** | ✅ Yes | `post_platforms_*` | عبر posts | عبر posts | 🟡 يحتاج تحقق |
| **post_variants** | ✅ Yes | `post_variants_*` | عبر posts | عبر posts | 🟡 يحتاج تحقق |
| **comments** | ✅ Yes | `comments_*` | حسب scope + client_id | الجميع (للإضافة) | 🟡 يحتاج تحقق |
| **approvals** | ✅ Yes | `approvals_*` | عبر posts | Client + Admin/Manager | 🟡 يحتاج تحقق |
| **assets** | ✅ Yes | `assets_*` | عبر posts | عبر posts | 🚨 Storage bucket قد يكون public |
| **notifications** | ✅ Yes | `notifications_*` | المستخدم نفسه | النظام | ✅ آمن |

---

## 6. تفاصيل سياسات RLS

### clients
```sql
-- SELECT: Admin/Manager يرون الكل، Client يرى عميله، Writer/Designer يرون المخصصين
CREATE POLICY "clients_select" ON clients FOR SELECT USING (
  is_admin_or_manager() 
  OR id IN (SELECT get_user_client_ids())
);

-- INSERT/UPDATE/DELETE: Admin/Manager فقط
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (is_admin_or_manager());
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (is_admin_or_manager());
CREATE POLICY "clients_delete" ON clients FOR DELETE USING (is_admin_or_manager());
```

### posts
```sql
-- SELECT: حسب client_id المسموح
CREATE POLICY "posts_select" ON posts FOR SELECT USING (
  client_id IN (SELECT get_user_client_ids())
);

-- INSERT: Admin/Manager أو Writer/Designer للعملاء المخصصين
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (
  is_admin_or_manager() 
  OR client_id IN (SELECT get_user_client_ids())
);

-- UPDATE: مع فحص locked
CREATE POLICY "posts_update" ON posts FOR UPDATE USING (
  (is_admin_or_manager())
  OR (
    NOT locked 
    AND client_id IN (SELECT get_user_client_ids())
    AND NOT is_client_user()
  )
);

-- DELETE: Admin/Manager فقط
CREATE POLICY "posts_delete" ON posts FOR DELETE USING (is_admin_or_manager());
```

### comments
```sql
-- SELECT: التعليقات الداخلية للفريق فقط، التعليقات العامة للجميع
CREATE POLICY "comments_select" ON comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts p 
    WHERE p.id = post_id 
    AND p.client_id IN (SELECT get_user_client_ids())
  )
  AND (
    scope = 'client' 
    OR NOT is_client_user()
  )
);
```

---

## 7. Helper Functions

```sql
-- الحصول على team_member الحالي
CREATE OR REPLACE FUNCTION get_current_team_member()
RETURNS TABLE(id UUID, role TEXT, client_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT tm.id, tm.role, tm.client_id
  FROM team_members tm
  WHERE tm.user_id = auth.uid()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- هل المستخدم admin أو manager
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM team_members WHERE user_id = auth.uid();
  RETURN user_role IN ('admin', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- هل المستخدم client
CREATE OR REPLACE FUNCTION is_client_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM team_members WHERE user_id = auth.uid();
  RETURN user_role = 'client';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- الحصول على client_ids المسموحة للمستخدم
CREATE OR REPLACE FUNCTION get_user_client_ids()
RETURNS SETOF UUID AS $$
DECLARE
  user_role TEXT;
  user_client_id UUID;
  user_team_member_id UUID;
BEGIN
  SELECT tm.role, tm.client_id, tm.id 
  INTO user_role, user_client_id, user_team_member_id
  FROM team_members tm
  WHERE tm.user_id = auth.uid();
  
  IF user_role IN ('admin', 'manager') THEN
    RETURN QUERY SELECT c.id FROM clients c;
  ELSIF user_role = 'client' AND user_client_id IS NOT NULL THEN
    RETURN QUERY SELECT user_client_id;
  ELSE
    RETURN QUERY 
    SELECT DISTINCT tmc.client_id FROM team_member_clients tmc 
    WHERE tmc.team_member_id = user_team_member_id
    UNION
    SELECT DISTINCT p.client_id FROM posts p 
    WHERE p.assigned_writer = user_team_member_id 
       OR p.assigned_designer = user_team_member_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

## 8. المخاطر والثغرات

| الخطر | المستوى | الوصف | الحل |
|-------|---------|-------|------|
| 🚨 RLS غير مُطبق | عالي | السياسات مكتوبة لكن قد لا تكون مُفعّلة على Supabase | تشغيل scripts/009_complete_rls_policies.sql |
| 🚨 Storage public | عالي | bucket قد يكون public | تشغيل scripts/010_storage_security.sql |
| 🟡 No audit log | متوسط | لا يوجد سجل للعمليات | إضافة جدول audit_log |
| 🟡 Session hijacking | متوسط | لا يوجد rate limiting | إضافة rate limiting |
| 🟡 Password policy | منخفض | لا يوجد سياسة كلمات مرور قوية | تفعيل في Supabase |

---

## 9. خطوات التحقق

### للتحقق من RLS
```sql
-- 1. تسجيل دخول كعميل A
-- 2. محاولة الوصول لبوست عميل B
SELECT * FROM posts WHERE client_id = 'client_b_id';
-- يجب أن يُرجع 0 rows

-- 3. محاولة تعديل بوست عميل B
UPDATE posts SET title = 'hacked' WHERE client_id = 'client_b_id';
-- يجب أن يفشل
```

### للتحقق من Storage
```bash
# محاولة الوصول لملف بدون تسجيل دخول
curl https://[project].supabase.co/storage/v1/object/public/post-assets/[file]
# يجب أن يُرجع 403 إذا كان private
```
