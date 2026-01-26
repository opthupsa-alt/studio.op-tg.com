# 13 - Migrations & Setup
## الترحيلات وإعداد المشروع

**تاريخ التقرير:** 2026-01-26

---

## 1. قائمة Scripts المطلوب تشغيلها

### ترتيب التنفيذ
```
1. 001_create_schema.sql      ← إنشاء الجداول الأساسية
2. 002_seed_data.sql          ← بيانات تجريبية (اختياري)
3. 003_create_admin_user.sql  ← إنشاء مستخدم admin
4. 004_update_schema.sql      ← تحديثات على الـ schema
5. 005_rls_policies.sql       ← سياسات RLS الأولية
6. 006_team_member_clients.sql← جدول تخصيص العملاء
7. 007_storage_setup.sql      ← إعداد Storage bucket
8. 008_notifications.sql      ← جدول الإشعارات
9. 009_complete_rls_policies.sql ← سياسات RLS الكاملة (الأهم)
10. 010_storage_security.sql  ← أمان Storage
11. 011_tenant_isolation_test.sql ← اختبار العزل (اختياري)
```

### تفاصيل كل Script

| Script | الحجم | الوظيفة | مطلوب؟ |
|--------|-------|---------|--------|
| `001_create_schema.sql` | 18KB | إنشاء كل الجداول + indexes | ✅ نعم |
| `002_seed_data.sql` | 12KB | بيانات تجريبية | 🟡 للتطوير فقط |
| `003_create_admin_user.sql` | 2KB | إنشاء admin | ✅ نعم |
| `004_update_schema.sql` | 9KB | تحديثات schema | ✅ نعم |
| `005_rls_policies.sql` | 13KB | RLS أولية | ⚠️ استبدل بـ 009 |
| `006_team_member_clients.sql` | 8KB | جدول M:N | ✅ نعم |
| `007_storage_setup.sql` | 3KB | إنشاء bucket | ✅ نعم |
| `008_notifications.sql` | 6KB | جدول الإشعارات | ✅ نعم |
| `009_complete_rls_policies.sql` | 21KB | RLS الكاملة | ✅ **الأهم** |
| `010_storage_security.sql` | 6KB | أمان Storage | ✅ نعم |
| `011_tenant_isolation_test.sql` | 9KB | اختبارات | 🟡 للتحقق |

---

## 2. خطوات تشغيل المشروع من الصفر

### الخطوة 1: إعداد Supabase

```bash
# 1. إنشاء مشروع جديد على supabase.com
# 2. الحصول على:
#    - Project URL
#    - anon key
#    - service_role key (للـ admin operations)
```

### الخطوة 2: إعداد ملف البيئة

```bash
# نسخ ملف المثال
cp .env.example .env.local

# تعديل القيم
```

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

### الخطوة 3: تشغيل Schema

```bash
# الطريقة 1: عبر Supabase Dashboard
# 1. افتح SQL Editor
# 2. الصق محتوى كل script بالترتيب
# 3. اضغط Run

# الطريقة 2: عبر psql
psql "postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres" \
  -f scripts/001_create_schema.sql
```

### الخطوة 4: تشغيل RLS Policies

```sql
-- الأهم: تشغيل 009_complete_rls_policies.sql
-- هذا يحتوي على كل السياسات المطلوبة
```

### الخطوة 5: إعداد Storage Bucket

```sql
-- تشغيل 007_storage_setup.sql
-- ثم 010_storage_security.sql
```

### الخطوة 6: إنشاء Admin User

```sql
-- تشغيل 003_create_admin_user.sql
-- أو استخدام السكربت:
node scripts/create-admin.mjs
```

### الخطوة 7: تثبيت Dependencies

```bash
pnpm install
```

### الخطوة 8: تشغيل المشروع

```bash
# Development
pnpm dev

# Production build
pnpm build
pnpm start
```

---

## 3. البيئة المطلوبة (Environment Variables)

### المتغيرات المطلوبة

```env
# Supabase (مطلوب)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# اختياري
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### ملاحظات أمنية
- ❌ لا تشارك `SUPABASE_SERVICE_ROLE_KEY` أبداً
- ❌ لا تضع المفاتيح في Git
- ✅ استخدم `.env.local` للتطوير
- ✅ استخدم environment variables في الـ hosting

---

## 4. Seed/Demo Data

### تشغيل بيانات تجريبية

```bash
# الطريقة 1: SQL مباشر
psql ... -f scripts/002_seed_data.sql

# الطريقة 2: عبر Dashboard
# الصق محتوى 002_seed_data.sql في SQL Editor
```

### محتوى البيانات التجريبية

| الجدول | العدد | الوصف |
|--------|-------|-------|
| platforms | 5 | Instagram, TikTok, Snapchat, X, LinkedIn |
| clients | 3 | عملاء تجريبيين |
| team_members | 5 | admin, manager, writer, designer, client |
| plans | 3 | خطط شهرية |
| posts | 15 | بوستات متنوعة |

---

## 5. ملاحظات نشر Production

### 5.1 Vercel Deployment

```bash
# 1. ربط المشروع
vercel link

# 2. إضافة environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# 3. النشر
vercel --prod
```

### 5.2 Supabase Production Settings

```
1. Authentication → Settings:
   - Site URL: https://your-domain.com
   - Redirect URLs: https://your-domain.com/**

2. Authentication → Providers → Email:
   - Confirm email: OFF (للتفعيل الفوري)
   - أو ON مع إعداد SMTP

3. Database → Settings:
   - Connection pooling: ON
   - Pool size: حسب الحاجة

4. Storage → post-assets:
   - Public: OFF
   - File size limit: حسب الحاجة
```

### 5.3 Security Checklist للـ Production

```markdown
[ ] RLS مُفعّل على كل الجداول
[ ] Storage bucket private
[ ] Service role key آمن
[ ] HTTPS مُفعّل
[ ] Rate limiting (Supabase أو Vercel)
[ ] Backup مُفعّل
[ ] Monitoring مُفعّل
```

---

## 6. Scripts المساعدة

### analyze-db.mjs
```bash
# تحليل قاعدة البيانات
node scripts/analyze-db.mjs
```

### check-user.mjs
```bash
# فحص مستخدم معين
node scripts/check-user.mjs [email]
```

### create-admin.mjs
```bash
# إنشاء admin جديد
node scripts/create-admin.mjs
```

### test-connection.mjs
```bash
# اختبار الاتصال
node scripts/test-connection.mjs
```

### cleanup-data.mjs
```bash
# تنظيف البيانات التجريبية
node scripts/cleanup-data.mjs
```

---

## 7. Troubleshooting

### مشكلة: RLS يمنع الوصول

```sql
-- تحقق من أن المستخدم له team_member
SELECT * FROM team_members WHERE user_id = auth.uid();

-- تحقق من الـ policies
SELECT * FROM pg_policies WHERE tablename = 'posts';
```

### مشكلة: Storage access denied

```sql
-- تحقق من إعدادات الـ bucket
SELECT * FROM storage.buckets WHERE id = 'post-assets';

-- تحقق من الـ policies
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
```

### مشكلة: Auth لا يعمل

```bash
# تحقق من environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# تحقق من Supabase Dashboard → Authentication → Users
```

---

## 8. ملخص الإعداد السريع

```bash
# 1. Clone
git clone [repo] && cd content-planning-platform

# 2. Install
pnpm install

# 3. Environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Database (run in Supabase SQL Editor)
# - 001_create_schema.sql
# - 004_update_schema.sql
# - 006_team_member_clients.sql
# - 007_storage_setup.sql
# - 008_notifications.sql
# - 009_complete_rls_policies.sql
# - 010_storage_security.sql

# 5. Create admin
node scripts/create-admin.mjs

# 6. Run
pnpm dev
```

---

## 9. متطلبات النظام

| المتطلب | الإصدار |
|---------|---------|
| Node.js | 18+ |
| pnpm | 8+ |
| Supabase | أي إصدار حديث |
| Browser | Chrome/Firefox/Safari حديث |
