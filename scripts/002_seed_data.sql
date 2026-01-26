-- Seed data for الهدف الأمثل للتسويق platform
-- This script adds sample data that matches the existing schema

-- Add more platforms (instagram, tiktok, snapchat, x, linkedin already exist from schema)
INSERT INTO platforms (key, name, icon) VALUES
  ('facebook', 'Facebook', 'facebook'),
  ('youtube', 'YouTube', 'youtube')
ON CONFLICT (key) DO NOTHING;

-- Insert sample clients
INSERT INTO clients (id, name, status, brand_primary_color, timezone) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'حلول التقنية', 'active', '#3B82F6', 'Asia/Riyadh'),
  ('c1000000-0000-0000-0000-000000000002', 'الأغذية الخضراء', 'active', '#22C55E', 'Asia/Riyadh'),
  ('c1000000-0000-0000-0000-000000000003', 'بيت الأزياء', 'active', '#EC4899', 'Asia/Riyadh'),
  ('c1000000-0000-0000-0000-000000000004', 'أوتو موتورز', 'active', '#F59E0B', 'Asia/Riyadh'),
  ('c1000000-0000-0000-0000-000000000005', 'صحة بلس', 'active', '#06B6D4', 'Asia/Riyadh')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  brand_primary_color = EXCLUDED.brand_primary_color;

-- Get platform IDs and assign to clients
INSERT INTO client_platforms (client_id, platform_id, enabled)
SELECT 
  'c1000000-0000-0000-0000-000000000001'::uuid,
  id,
  true
FROM platforms WHERE key IN ('instagram', 'facebook', 'x', 'linkedin')
ON CONFLICT (client_id, platform_id) DO NOTHING;

INSERT INTO client_platforms (client_id, platform_id, enabled)
SELECT 
  'c1000000-0000-0000-0000-000000000002'::uuid,
  id,
  true
FROM platforms WHERE key IN ('instagram', 'facebook', 'tiktok')
ON CONFLICT (client_id, platform_id) DO NOTHING;

INSERT INTO client_platforms (client_id, platform_id, enabled)
SELECT 
  'c1000000-0000-0000-0000-000000000003'::uuid,
  id,
  true
FROM platforms WHERE key IN ('instagram', 'tiktok', 'snapchat')
ON CONFLICT (client_id, platform_id) DO NOTHING;

INSERT INTO client_platforms (client_id, platform_id, enabled)
SELECT 
  'c1000000-0000-0000-0000-000000000004'::uuid,
  id,
  true
FROM platforms WHERE key IN ('instagram', 'facebook', 'youtube')
ON CONFLICT (client_id, platform_id) DO NOTHING;

INSERT INTO client_platforms (client_id, platform_id, enabled)
SELECT 
  'c1000000-0000-0000-0000-000000000005'::uuid,
  id,
  true
FROM platforms WHERE key IN ('instagram', 'facebook', 'x')
ON CONFLICT (client_id, platform_id) DO NOTHING;

-- Insert sample plans (monthly plans)
INSERT INTO plans (id, client_id, year, month, status) VALUES
  ('11000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 2026, 1, 'active'),
  ('11000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 2026, 2, 'draft'),
  ('11000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 2026, 1, 'active'),
  ('11000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000003', 2026, 1, 'active'),
  ('11000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000004', 2026, 1, 'active'),
  ('11000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000005', 2026, 1, 'active')
ON CONFLICT (client_id, year, month) DO UPDATE SET status = EXCLUDED.status;

-- Insert sample posts for January 2026
INSERT INTO posts (id, plan_id, client_id, publish_date, title, main_goal, status, position) VALUES
  -- Tech Solutions posts
  ('22000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', '2026-01-27', 'إطلاق منتجنا الجديد!', 'awareness', 'scheduled', 1),
  ('22000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', '2026-01-28', 'مميزات المنتج الجديد', 'engagement', 'approved', 2),
  ('22000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', '2026-01-29', 'شهادات العملاء', 'leads', 'client_review', 3),
  ('22000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', '2026-01-30', 'عرض خاص للمشتركين', 'sales', 'draft', 4),
  
  -- Green Foods posts
  ('22000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', '2026-01-25', 'وصفة اليوم: سلطة صحية', 'engagement', 'posted', 1),
  ('22000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', '2026-01-28', 'نصائح غذائية للشتاء', 'awareness', 'scheduled', 2),
  ('22000000-0000-0000-0000-000000000007', '11000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', '2026-01-30', 'منتجات جديدة', 'sales', 'idea', 3),
  
  -- Fashion House posts
  ('22000000-0000-0000-0000-000000000008', '11000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000003', '2026-01-26', 'تخفيضات حتى 50%', 'sales', 'scheduled', 1),
  ('22000000-0000-0000-0000-000000000009', '11000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000003', '2026-01-27', 'موضة 2026', 'awareness', 'approved', 2),
  ('22000000-0000-0000-0000-000000000010', '11000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000003', '2026-01-28', 'خلف الكواليس', 'engagement', 'internal_review', 3),
  
  -- Auto Motors posts
  ('22000000-0000-0000-0000-000000000011', '11000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000004', '2026-01-29', 'الموديل الجديد قريباً', 'awareness', 'scheduled', 1),
  ('22000000-0000-0000-0000-000000000012', '11000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000004', '2026-01-30', 'مواصفات تقنية', 'engagement', 'design', 2),
  
  -- Health Plus posts
  ('22000000-0000-0000-0000-000000000013', '11000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000005', '2026-01-24', 'نصيحة صحية', 'awareness', 'posted', 1),
  ('22000000-0000-0000-0000-000000000014', '11000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000005', '2026-01-27', 'تمارين منزلية', 'engagement', 'scheduled', 2),
  ('22000000-0000-0000-0000-000000000015', '11000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000005', '2026-01-28', 'وصفات صحية', 'engagement', 'approved', 3)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  main_goal = EXCLUDED.main_goal,
  status = EXCLUDED.status;

-- Insert post platforms (link posts to their target platforms)
INSERT INTO post_platforms (post_id, platform_id)
SELECT '22000000-0000-0000-0000-000000000001'::uuid, id FROM platforms WHERE key IN ('instagram', 'facebook', 'linkedin')
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_platforms (post_id, platform_id)
SELECT '22000000-0000-0000-0000-000000000002'::uuid, id FROM platforms WHERE key IN ('instagram', 'facebook')
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_platforms (post_id, platform_id)
SELECT '22000000-0000-0000-0000-000000000003'::uuid, id FROM platforms WHERE key IN ('instagram', 'youtube')
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_platforms (post_id, platform_id)
SELECT '22000000-0000-0000-0000-000000000004'::uuid, id FROM platforms WHERE key IN ('instagram', 'x')
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_platforms (post_id, platform_id)
SELECT '22000000-0000-0000-0000-000000000005'::uuid, id FROM platforms WHERE key IN ('instagram', 'facebook', 'tiktok')
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_platforms (post_id, platform_id)
SELECT '22000000-0000-0000-0000-000000000006'::uuid, id FROM platforms WHERE key IN ('instagram', 'facebook')
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_platforms (post_id, platform_id)
SELECT '22000000-0000-0000-0000-000000000007'::uuid, id FROM platforms WHERE key IN ('instagram')
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_platforms (post_id, platform_id)
SELECT '22000000-0000-0000-0000-000000000008'::uuid, id FROM platforms WHERE key IN ('instagram', 'tiktok', 'snapchat')
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_platforms (post_id, platform_id)
SELECT '22000000-0000-0000-0000-000000000009'::uuid, id FROM platforms WHERE key IN ('instagram', 'tiktok')
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_platforms (post_id, platform_id)
SELECT '22000000-0000-0000-0000-000000000010'::uuid, id FROM platforms WHERE key IN ('instagram', 'snapchat')
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_platforms (post_id, platform_id)
SELECT '22000000-0000-0000-0000-000000000011'::uuid, id FROM platforms WHERE key IN ('instagram', 'facebook', 'youtube')
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_platforms (post_id, platform_id)
SELECT '22000000-0000-0000-0000-000000000012'::uuid, id FROM platforms WHERE key IN ('instagram', 'facebook')
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_platforms (post_id, platform_id)
SELECT '22000000-0000-0000-0000-000000000013'::uuid, id FROM platforms WHERE key IN ('instagram', 'facebook', 'x')
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_platforms (post_id, platform_id)
SELECT '22000000-0000-0000-0000-000000000014'::uuid, id FROM platforms WHERE key IN ('instagram', 'youtube')
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_platforms (post_id, platform_id)
SELECT '22000000-0000-0000-0000-000000000015'::uuid, id FROM platforms WHERE key IN ('instagram', 'tiktok')
ON CONFLICT (post_id, platform_id) DO NOTHING;

-- Insert post variants with platform-specific content
INSERT INTO post_variants (id, post_id, platform_id, caption, hashtags, status)
SELECT 
  '33000000-0000-0000-0000-000000000001'::uuid,
  '22000000-0000-0000-0000-000000000001'::uuid,
  id,
  'نحن متحمسون للإعلان عن إطلاق منتجنا التقني الجديد! منتج سيغير طريقة عملك.',
  '#تقنية #ابتكار #حلول_التقنية #السعودية',
  'ready'
FROM platforms WHERE key = 'instagram'
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_variants (id, post_id, platform_id, caption, hashtags, status)
SELECT 
  '33000000-0000-0000-0000-000000000002'::uuid,
  '22000000-0000-0000-0000-000000000001'::uuid,
  id,
  'منتجنا التقني الجديد قادم! استعدوا للثورة',
  '#تقنية #ابتكار',
  'ready'
FROM platforms WHERE key = 'x'
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_variants (id, post_id, platform_id, caption, hashtags, status)
SELECT 
  '33000000-0000-0000-0000-000000000003'::uuid,
  '22000000-0000-0000-0000-000000000005'::uuid,
  id,
  'وصفة اليوم - سلطة صحية ولذيذة بمكونات طبيعية 100%

المقادير:
- خس طازج
- طماطم
- خيار
- زيت زيتون',
  '#صحة #وصفات #الاغذية_الخضراء',
  'approved'
FROM platforms WHERE key = 'instagram'
ON CONFLICT (post_id, platform_id) DO NOTHING;

INSERT INTO post_variants (id, post_id, platform_id, caption, hashtags, status)
SELECT 
  '33000000-0000-0000-0000-000000000004'::uuid,
  '22000000-0000-0000-0000-000000000008'::uuid,
  id,
  'تخفيضات كبرى! خصومات تصل إلى 50%

لا تفوتوا الفرصة! العرض لفترة محدودة.

تسوقوا الآن من الرابط في البايو',
  '#تخفيضات #موضة #بيت_الأزياء #السعودية',
  'ready'
FROM platforms WHERE key = 'instagram'
ON CONFLICT (post_id, platform_id) DO NOTHING;

-- =====================================================
-- TEAM MEMBERS - أعضاء الفريق للاختبار
-- =====================================================
-- ملاحظة: يجب إنشاء المستخدم أولاً عبر Supabase Auth
-- ثم ربطه بـ team_members

INSERT INTO team_members (id, user_id, full_name, email, role, client_id, avatar_url) VALUES
  ('tm000000-0000-0000-0000-000000000001', NULL, 'أحمد محمد', 'admin@example.com', 'admin', NULL, NULL),
  ('tm000000-0000-0000-0000-000000000002', NULL, 'سارة أحمد', 'sara@example.com', 'manager', NULL, NULL),
  ('tm000000-0000-0000-0000-000000000003', NULL, 'محمد علي', 'mohamed@example.com', 'writer', NULL, NULL),
  ('tm000000-0000-0000-0000-000000000004', NULL, 'فاطمة حسن', 'fatima@example.com', 'designer', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role;
