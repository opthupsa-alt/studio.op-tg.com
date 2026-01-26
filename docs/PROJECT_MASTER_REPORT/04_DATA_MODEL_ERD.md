# 04 - Data Model & ERD
## نموذج البيانات والعلاقات

**تاريخ التقرير:** 2026-01-26

---

## ERD نصي (Entity Relationship Diagram)

```
┌─────────────────┐
│    platforms    │
├─────────────────┤
│ id (PK)         │
│ key (UNIQUE)    │
│ name            │
│ icon            │
│ created_at      │
└─────────────────┘
        │
        │ (M:N via post_platforms)
        ▼
┌─────────────────┐       ┌─────────────────┐
│     clients     │       │  team_members   │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ client_id (FK)  │ (للعملاء فقط)
│ name            │       │ id (PK)         │
│ status          │       │ user_id (FK)    │──► auth.users
│ brand_color     │       │ full_name       │
│ timezone        │       │ email           │
│ created_at      │       │ role            │
└─────────────────┘       │ avatar_url      │
        │                 │ created_at      │
        │                 └─────────────────┘
        │                         │
        ▼                         │
┌─────────────────┐               │
│      plans      │               │
├─────────────────┤               │
│ id (PK)         │               │
│ client_id (FK)  │               │
│ year            │               │
│ month           │               │
│ status          │               │
│ created_at      │               │
│ UNIQUE(client,  │               │
│   year, month)  │               │
└─────────────────┘               │
        │                         │
        ▼                         │
┌─────────────────┐               │
│      posts      │               │
├─────────────────┤               │
│ id (PK)         │               │
│ plan_id (FK)    │               │
│ client_id (FK)  │───────────────┤ (denormalized for RLS)
│ publish_date    │               │
│ title           │               │
│ main_goal       │               │
│ status          │               │
│ assigned_writer │───────────────┤ (FK to team_members)
│ assigned_designer│──────────────┤ (FK to team_members)
│ created_by      │───────────────┤ (FK to auth.users)
│ locked          │               │
│ position        │               │
│ created_at      │               │
│ updated_at      │               │
└─────────────────┘               │
        │                         │
        ├──────────────────┬──────┴─────────┬─────────────────┐
        ▼                  ▼                ▼                 ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│post_platforms │  │ post_variants │  │   comments    │  │  approvals    │
├───────────────┤  ├───────────────┤  ├───────────────┤  ├───────────────┤
│ id (PK)       │  │ id (PK)       │  │ id (PK)       │  │ id (PK)       │
│ post_id (FK)  │  │ post_id (FK)  │  │ post_id (FK)  │  │ post_id (FK)  │
│ platform_id   │  │ platform_id   │  │ user_id (FK)  │  │ approver_id   │
│ created_at    │  │ caption       │  │ scope         │  │ status        │
│ UNIQUE(post,  │  │ hashtags      │  │ comment       │  │ note          │
│   platform)   │  │ cta           │  │ created_at    │  │ created_at    │
└───────────────┘  │ design_notes  │  └───────────────┘  └───────────────┘
                   │ status        │
                   │ created_at    │
                   │ updated_at    │
                   │ UNIQUE(post,  │
                   │   platform)   │
                   └───────────────┘
                          │
                          ▼
                   ┌───────────────┐
                   │    assets     │
                   ├───────────────┤
                   │ id (PK)       │
                   │ post_id (FK)  │
                   │ variant_id    │ (optional FK)
                   │ type          │
                   │ url           │
                   │ name          │
                   │ created_at    │
                   └───────────────┘
```

---

## تفاصيل الجداول

### 1. platforms (المنصات)
```sql
CREATE TABLE platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,        -- instagram, tiktok, etc.
  name TEXT NOT NULL,              -- Instagram, TikTok, etc.
  icon TEXT,                       -- اسم الأيقونة
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**البيانات الافتراضية:** Instagram, TikTok, Snapchat, X, LinkedIn

### 2. clients (العملاء)
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  brand_primary_color TEXT DEFAULT '#0ea5e9',
  timezone TEXT DEFAULT 'Asia/Riyadh',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**ملاحظة:** هذا هو جدول العزل الرئيسي - كل البيانات مرتبطة بـ client_id

### 3. team_members (أعضاء الفريق)
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'writer', 'designer', 'client')),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,  -- للعملاء فقط
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```
**ملاحظة:** `client_id` يُستخدم فقط عندما `role = 'client'`

### 4. team_member_clients (تخصيص العملاء للأعضاء)
```sql
CREATE TABLE team_member_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_member_id, client_id)
);
```
**ملاحظة:** يسمح بتخصيص عدة عملاء لـ Writer/Designer

### 5. plans (الخطط الشهرية)
```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, year, month)  -- خطة واحدة لكل عميل/شهر
);
```

### 6. posts (البوستات)
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,  -- denormalized
  publish_date DATE NOT NULL,
  title TEXT NOT NULL,
  main_goal TEXT CHECK (main_goal IN ('awareness', 'engagement', 'leads', 'messages', 'sales')),
  status TEXT DEFAULT 'idea' CHECK (status IN ('idea', 'draft', 'design', 'internal_review', 'client_review', 'approved', 'scheduled', 'posted')),
  assigned_writer UUID REFERENCES team_members(id) ON DELETE SET NULL,
  assigned_designer UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked BOOLEAN DEFAULT false,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
**ملاحظة:** `client_id` مكرر (denormalized) لتسهيل RLS

### 7. post_platforms (منصات البوست)
```sql
CREATE TABLE post_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, platform_id)
);
```

### 8. post_variants (نسخ البوست لكل منصة)
```sql
CREATE TABLE post_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  caption TEXT,
  hashtags TEXT,
  cta TEXT,
  design_notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'approved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, platform_id)
);
```

### 9. assets (الملفات)
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

### 10. comments (التعليقات)
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scope TEXT DEFAULT 'internal' CHECK (scope IN ('internal', 'client')),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**ملاحظة:** `scope = 'internal'` للتعليقات الداخلية، `scope = 'client'` للتعليقات المرئية للعميل

### 11. approvals (الموافقات)
```sql
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'pending')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 12. notifications (الإشعارات)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## الفهارس (Indexes)

```sql
CREATE INDEX idx_posts_plan_id ON posts(plan_id);
CREATE INDEX idx_posts_client_id ON posts(client_id);
CREATE INDEX idx_posts_publish_date ON posts(publish_date);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_post_platforms_post_id ON post_platforms(post_id);
CREATE INDEX idx_post_variants_post_id ON post_variants(post_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_approvals_post_id ON approvals(post_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_client_id ON team_members(client_id);
```

---

## قيود التفرد (Uniqueness)

| الجدول | القيد | الغرض |
|--------|-------|-------|
| platforms | `key` | منع تكرار المنصات |
| team_members | `user_id` | مستخدم واحد = عضو واحد |
| plans | `(client_id, year, month)` | خطة واحدة لكل عميل/شهر |
| post_platforms | `(post_id, platform_id)` | منصة واحدة لكل بوست |
| post_variants | `(post_id, platform_id)` | نسخة واحدة لكل بوست/منصة |
| team_member_clients | `(team_member_id, client_id)` | تخصيص واحد لكل عضو/عميل |

---

## أين يوجد client_id Scoping

| الجدول | client_id | الملاحظة |
|--------|-----------|----------|
| clients | ✅ (هو نفسه) | الجدول الرئيسي |
| team_members | ✅ (للعملاء) | `client_id` عندما `role='client'` |
| plans | ✅ مباشر | `client_id` FK |
| posts | ✅ مباشر | `client_id` FK (denormalized) |
| post_platforms | ❌ غير مباشر | عبر `posts.client_id` |
| post_variants | ❌ غير مباشر | عبر `posts.client_id` |
| assets | ❌ غير مباشر | عبر `posts.client_id` |
| comments | ❌ غير مباشر | عبر `posts.client_id` |
| approvals | ❌ غير مباشر | عبر `posts.client_id` |

---

## مخاطر تسريب البيانات

| الخطر | الجدول | السبب | الحل |
|-------|--------|-------|------|
| 🚨 عالي | posts | بدون RLS يمكن رؤية كل البوستات | تفعيل RLS + policy |
| 🚨 عالي | plans | بدون RLS يمكن رؤية كل الخطط | تفعيل RLS + policy |
| 🚨 عالي | clients | بدون RLS يمكن رؤية كل العملاء | تفعيل RLS + policy |
| 🟡 متوسط | comments | التعليقات الداخلية قد تظهر للعميل | فلترة بـ scope |
| 🟡 متوسط | assets | الملفات قد تكون public | ضبط Storage bucket |
| 🟡 متوسط | team_members | قد يرى العميل أعضاء عملاء آخرين | RLS policy |

---

## ملاحظات هامة

1. **Denormalization:** `client_id` موجود في `posts` رغم وجوده في `plans` لتسهيل RLS
2. **Soft Delete:** لا يوجد - الحذف فعلي مع CASCADE
3. **Audit Trail:** لا يوجد جدول audit_log حالياً
4. **Multi-tenancy:** يعتمد على `client_id` + RLS
