# 03 - علاقات الكيانات (Entity Relations)

## تاريخ التدقيق: 2026-01-26

---

## 1. مخطط العلاقات النصي (ERD)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MULTI-TENANT ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────────────────┘

                                 ┌──────────────┐
                                 │   auth.users │
                                 │──────────────│
                                 │ id (PK)      │
                                 │ email        │
                                 └──────┬───────┘
                                        │
                                        │ 1:1
                                        ▼
┌──────────────┐              ┌──────────────────┐
│   clients    │◄─────────────│  team_members    │
│──────────────│    N:1       │──────────────────│
│ id (PK)      │              │ id (PK)          │
│ name         │              │ user_id (FK)     │──────► auth.users
│ status       │              │ full_name        │
│ brand_color  │              │ email            │
│ timezone     │              │ role             │
└──────┬───────┘              │ client_id (FK)   │──────► clients (للعميل فقط)
       │                      │ avatar_url       │
       │                      └──────────────────┘
       │
       │ 1:N
       ▼
┌──────────────────┐          ┌──────────────────┐
│     plans        │          │    platforms     │
│──────────────────│          │──────────────────│
│ id (PK)          │          │ id (PK)          │
│ client_id (FK)   │          │ key              │
│ year             │          │ name             │
│ month            │          │ icon             │
│ status           │          └────────┬─────────┘
└──────┬───────────┘                   │
       │                               │
       │ 1:N                           │
       ▼                               │
┌──────────────────┐                   │
│     posts        │                   │
│──────────────────│                   │
│ id (PK)          │                   │
│ plan_id (FK)     │──────► plans      │
│ client_id (FK)   │──────► clients    │
│ publish_date     │                   │
│ title            │                   │
│ main_goal        │                   │
│ post_type        │                   │
│ status           │                   │
│ assigned_writer  │──────► team_members
│ assigned_designer│──────► team_members
│ created_by       │──────► auth.users
│ locked           │                   │
│ position         │                   │
└──────┬───────────┘                   │
       │                               │
       ├───────────────────────────────┤
       │                               │
       │ 1:N                           │ N:M
       ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│  post_platforms  │          │  post_variants   │
│──────────────────│          │──────────────────│
│ id (PK)          │          │ id (PK)          │
│ post_id (FK)     │          │ post_id (FK)     │
│ platform_id (FK) │          │ platform_id (FK) │
└──────────────────┘          │ caption          │
                              │ hashtags         │
                              │ cta              │
                              │ design_notes     │
                              │ status           │
                              └──────────────────┘

       │
       │ 1:N
       ▼
┌──────────────────┐          ┌──────────────────┐
│    comments      │          │    approvals     │
│──────────────────│          │──────────────────│
│ id (PK)          │          │ id (PK)          │
│ post_id (FK)     │          │ post_id (FK)     │
│ user_id (FK)     │          │ client_user_id   │
│ scope            │          │ status           │
│ comment          │          │ note             │
└──────────────────┘          └──────────────────┘

       │
       │ 1:N
       ▼
┌──────────────────┐
│     assets       │
│──────────────────│
│ id (PK)          │
│ post_id (FK)     │
│ variant_id (FK)  │
│ type             │
│ url              │
│ name             │
└──────────────────┘
```

---

## 2. تفاصيل الكيانات

### 2.1 clients (العملاء) - Tenant الرئيسي

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',        -- 'active' | 'inactive'
  brand_primary_color TEXT,
  timezone TEXT DEFAULT 'Asia/Riyadh',
  created_at TIMESTAMPTZ
);
```

**العلاقات:**
- `1:N` → `plans` (كل عميل له خطط متعددة)
- `1:N` → `posts` (كل عميل له بوستات متعددة)
- `1:N` → `team_members` (أعضاء مرتبطين بالعميل)
- `1:N` → `client_platforms` (منصات مفعلة للعميل)

**ملاحظة مهمة:** `client_id` هو الـ **Tenant ID** الذي يجب أن يكون موجوداً في كل query.

---

### 2.2 team_members (أعضاء الفريق)

```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),  -- ربط بـ Supabase Auth
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL,                       -- 'admin' | 'manager' | 'writer' | 'designer' | 'client'
  client_id UUID REFERENCES clients(id),    -- NULL للـ admin/manager، مطلوب للـ client
  avatar_url TEXT,
  created_at TIMESTAMPTZ
);
```

**الأدوار وصلاحياتها:**

| الدور | الوصف | client_id | الصلاحيات |
|-------|-------|-----------|-----------|
| `admin` | مدير النظام | NULL | كل شيء |
| `manager` | مشرف | NULL | إدارة كل العملاء |
| `writer` | كاتب محتوى | NULL* | كتابة وتعديل البوستات |
| `designer` | مصمم | NULL* | تصميم ورفع الملفات |
| `client` | عميل | **مطلوب** | عرض + موافقة/رفض فقط |

> *ملاحظة: Writer/Designer حالياً `client_id = NULL` مما يعني أنهم يرون كل العملاء. هذا **خطأ** يجب إصلاحه.

---

### 2.3 plans (الخطط الشهرية)

```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id),
  year INT NOT NULL,
  month INT NOT NULL,                       -- 1-12
  status TEXT DEFAULT 'draft',              -- 'draft' | 'active' | 'archived'
  created_at TIMESTAMPTZ,
  UNIQUE(client_id, year, month)            -- خطة واحدة لكل شهر لكل عميل
);
```

**العلاقات:**
- `N:1` → `clients` (كل خطة تابعة لعميل)
- `1:N` → `posts` (كل خطة تحتوي بوستات)

---

### 2.4 posts (البوستات)

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES plans(id),
  client_id UUID NOT NULL REFERENCES clients(id),  -- Denormalized للأداء
  publish_date DATE NOT NULL,
  title TEXT NOT NULL,
  main_goal TEXT,                           -- 'awareness' | 'engagement' | 'leads' | 'messages' | 'sales'
  post_type TEXT DEFAULT 'post',            -- 'post' | 'reel' | 'video' | 'story' | 'carousel'
  status TEXT DEFAULT 'idea',               -- workflow status
  assigned_writer UUID REFERENCES team_members(id),
  assigned_designer UUID REFERENCES team_members(id),
  created_by UUID REFERENCES auth.users(id),
  locked BOOLEAN DEFAULT false,             -- يُقفل عند الموافقة
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**حالات البوست (Workflow):**
```
idea → draft → design → internal_review → client_review → approved → scheduled → posted
                                              ↓
                                          rejected → draft
```

---

### 2.5 post_platforms (منصات البوست)

```sql
CREATE TABLE post_platforms (
  id UUID PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id),
  platform_id UUID NOT NULL REFERENCES platforms(id),
  created_at TIMESTAMPTZ,
  UNIQUE(post_id, platform_id)
);
```

**الغرض:** ربط N:M بين البوستات والمنصات.

---

### 2.6 post_variants (نسخ البوست)

```sql
CREATE TABLE post_variants (
  id UUID PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id),
  platform_id UUID NOT NULL REFERENCES platforms(id),
  caption TEXT,                             -- النص المخصص للمنصة
  hashtags TEXT,
  cta TEXT,                                 -- Call to Action
  design_notes TEXT,
  status TEXT DEFAULT 'draft',              -- 'draft' | 'ready' | 'approved'
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(post_id, platform_id)
);
```

**الغرض:** محتوى مخصص لكل منصة (Instagram vs Twitter vs LinkedIn).

---

### 2.7 comments (التعليقات)

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id),
  user_id UUID REFERENCES auth.users(id),
  scope TEXT DEFAULT 'internal',            -- 'internal' | 'client'
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ
);
```

**نطاق التعليقات:**
- `internal`: تعليقات الفريق الداخلي (لا يراها العميل)
- `client`: تعليقات مرئية للعميل

---

### 2.8 approvals (الموافقات)

```sql
CREATE TABLE approvals (
  id UUID PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id),
  client_user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL,                     -- 'approved' | 'rejected' | 'pending'
  note TEXT,                                -- سبب الرفض أو ملاحظات
  created_at TIMESTAMPTZ
);
```

**السلوك:**
- عند `approved`: `posts.locked = true` و `posts.status = 'approved'`
- عند `rejected`: `posts.locked = false` و `posts.status = 'rejected'`

---

### 2.9 assets (الملفات)

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id),
  variant_id UUID REFERENCES post_variants(id),  -- NULL = عام للبوست
  type TEXT NOT NULL,                       -- 'image' | 'video' | 'link' | 'file'
  url TEXT NOT NULL,                        -- Supabase Storage URL
  name TEXT,
  created_at TIMESTAMPTZ
);
```

---

## 3. حدود العزل (Tenant Boundaries)

### 3.1 القاعدة الذهبية

> **كل query يجب أن يكون مُقيّداً بـ `client_id`**

### 3.2 مصفوفة الوصول

| الدور | clients | plans | posts | comments | approvals |
|-------|---------|-------|-------|----------|-----------|
| admin | ✅ الكل | ✅ الكل | ✅ الكل | ✅ الكل | ✅ الكل |
| manager | ✅ الكل | ✅ الكل | ✅ الكل | ✅ الكل | ✅ الكل |
| writer | ❌ المسندين فقط | ❌ المسندين | ❌ المسندين | ✅ internal | ❌ |
| designer | ❌ المسندين فقط | ❌ المسندين | ❌ المسندين | ✅ internal | ❌ |
| client | ❌ عميله فقط | ❌ عميله | ❌ عميله | ✅ client scope | ✅ عميله |

### 3.3 المشاكل الحالية ⚠️

1. **Writer/Designer يرون كل العملاء:**
   - السبب: `client_id = NULL` في `team_members`
   - الحل: إضافة جدول `team_member_clients` للربط N:M

2. **لا يوجد تحقق من الإسناد:**
   - السبب: `assigned_writer` و `assigned_designer` غير مستخدمين في RLS
   - الحل: تحديث RLS policies

3. **Share page بدون حماية:**
   - السبب: لا يوجد password أو token
   - الحل: إضافة `share_token` أو `share_password` لجدول `plans`

---

## 4. الجدول المقترح: team_member_clients

لحل مشكلة ربط Writer/Designer بعملاء متعددين:

```sql
CREATE TABLE team_member_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_member_id, client_id)
);

-- RLS Policy
CREATE POLICY "team_member_clients_select" ON team_member_clients
  FOR SELECT USING (
    get_user_role() IN ('admin', 'manager')
    OR team_member_id = get_user_team_member_id()
  );
```

**الاستخدام في RLS:**
```sql
-- بدلاً من:
get_user_role() IN ('admin', 'manager', 'writer', 'designer')

-- نستخدم:
get_user_role() IN ('admin', 'manager')
OR EXISTS (
  SELECT 1 FROM team_member_clients tmc
  WHERE tmc.team_member_id = get_user_team_member_id()
  AND tmc.client_id = posts.client_id
)
```

---

## 5. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MIDDLEWARE (proxy.ts)                       │
│  - Check auth.getUser()                                          │
│  - Redirect if not authenticated                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER COMPONENT / API                        │
│  - Create Supabase client                                        │
│  - Query with automatic RLS                                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE RLS                                │
│  - get_user_role() → team_members.role                          │
│  - get_user_client_id() → team_members.client_id                │
│  - Filter data based on policies                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FILTERED DATA                               │
│  - Only data user is allowed to see                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. ملخص الإصلاحات المطلوبة

| الأولوية | الإصلاح | الجهد |
|----------|---------|-------|
| 🔴 عالية | إنشاء `team_member_clients` | 1 ساعة |
| 🔴 عالية | تحديث RLS للـ writer/designer | 2 ساعة |
| 🟡 متوسطة | إضافة `share_token` للـ plans | 1 ساعة |
| 🟡 متوسطة | استخدام `assigned_writer/designer` في RLS | 1 ساعة |
