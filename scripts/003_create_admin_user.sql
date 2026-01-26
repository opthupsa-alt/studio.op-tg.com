-- =====================================================
-- إنشاء مستخدم Admin للاختبار
-- =====================================================
-- هذا السكريبت يُنفذ في Supabase SQL Editor
-- بعد تنفيذ 001_create_schema.sql و 002_seed_data.sql

-- الخطوة 1: إنشاء المستخدم في auth.users
-- ملاحظة: يجب إنشاء المستخدم عبر Supabase Dashboard أو صفحة التسجيل
-- لأن Supabase لا يسمح بإدراج مباشر في auth.users عبر SQL

-- الخطوة 2: بعد إنشاء المستخدم، نفذ هذا لربطه بـ team_members
-- استبدل 'admin@example.com' بالبريد الذي سجلت به

-- للمستخدم admin@example.com
UPDATE team_members 
SET user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1)
WHERE email = 'admin@example.com' AND user_id IS NULL;

-- للمستخدم sara@example.com
UPDATE team_members 
SET user_id = (SELECT id FROM auth.users WHERE email = 'sara@example.com' LIMIT 1)
WHERE email = 'sara@example.com' AND user_id IS NULL;

-- للمستخدم mohamed@example.com
UPDATE team_members 
SET user_id = (SELECT id FROM auth.users WHERE email = 'mohamed@example.com' LIMIT 1)
WHERE email = 'mohamed@example.com' AND user_id IS NULL;

-- للمستخدم fatima@example.com
UPDATE team_members 
SET user_id = (SELECT id FROM auth.users WHERE email = 'fatima@example.com' LIMIT 1)
WHERE email = 'fatima@example.com' AND user_id IS NULL;

-- =====================================================
-- التحقق من الربط
-- =====================================================
SELECT 
  tm.full_name,
  tm.email,
  tm.role,
  CASE WHEN tm.user_id IS NOT NULL THEN 'مربوط ✓' ELSE 'غير مربوط ✗' END as status
FROM team_members tm
ORDER BY tm.role;
