-- =====================================================
-- Production Setup Script
-- Date: 2026-01-26
-- Purpose: Clean database and create Super Admin
-- =====================================================

-- =====================================================
-- 1. Clean all data (in correct order due to FK constraints)
-- =====================================================

-- Delete comments first
DELETE FROM comments;

-- Delete approvals
DELETE FROM approvals;

-- Delete post_platforms
DELETE FROM post_platforms;

-- Delete post_variants
DELETE FROM post_variants;

-- Delete assets
DELETE FROM assets;

-- Delete posts
DELETE FROM posts;

-- Delete plans
DELETE FROM plans;

-- Delete share_links
DELETE FROM share_links;

-- Delete team_member_clients
DELETE FROM team_member_clients;

-- Delete notifications
DELETE FROM notifications;

-- Delete audit_log
DELETE FROM audit_log;

-- Delete user_settings
DELETE FROM user_settings;

-- Delete team_members (except protected super admin)
DELETE FROM team_members WHERE email != 'admin@op-taget.com';

-- Delete clients
DELETE FROM clients;

-- =====================================================
-- 2. Verify cleanup
-- =====================================================
SELECT 'posts' as table_name, COUNT(*) as count FROM posts
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'team_members', COUNT(*) FROM team_members
UNION ALL
SELECT 'plans', COUNT(*) FROM plans;

-- =====================================================
-- Done!
-- =====================================================
SELECT 'Database cleaned successfully!' as result;
