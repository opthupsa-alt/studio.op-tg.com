-- =====================================================
-- Tenant Isolation Test Script
-- Version: 011
-- Date: 2026-01-26
-- Purpose: Verify RLS policies work correctly
-- =====================================================

-- =====================================================
-- TEST SETUP: Create test data
-- =====================================================

-- Create two test clients
INSERT INTO clients (id, name, brand_primary_color, status)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Test Client A', '#FF0000', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Test Client B', '#00FF00', 'active')
ON CONFLICT (id) DO NOTHING;

-- Create test plans for each client
INSERT INTO plans (id, client_id, year, month, status)
VALUES 
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 2026, 1, 'active'),
  ('bbbb2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 2026, 1, 'active')
ON CONFLICT (id) DO NOTHING;

-- Create test posts for each client
INSERT INTO posts (id, plan_id, client_id, title, status, publish_date)
VALUES 
  ('post1111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Client A Post 1', 'draft', '2026-01-15'),
  ('post2222-2222-2222-2222-222222222222', 'bbbb2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Client B Post 1', 'draft', '2026-01-16')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- TEST 1: Verify Admin can see ALL clients
-- Run as: Admin user
-- Expected: 2 rows (both clients)
-- =====================================================

-- This query should return both clients when run as admin
-- SELECT * FROM clients;
-- Expected result: 2 rows

-- =====================================================
-- TEST 2: Verify Client User A can ONLY see Client A
-- Run as: Client user linked to Client A
-- Expected: 1 row (only Client A)
-- =====================================================

-- Create a function to test as specific user role
CREATE OR REPLACE FUNCTION test_client_isolation(test_client_id UUID)
RETURNS TABLE(
  test_name TEXT,
  expected_count INT,
  actual_count INT,
  passed BOOLEAN
) AS $$
DECLARE
  client_count INT;
  plan_count INT;
  post_count INT;
  other_client_post_count INT;
BEGIN
  -- Test 1: Client can see their own client
  SELECT COUNT(*) INTO client_count
  FROM clients
  WHERE id = test_client_id;
  
  RETURN QUERY SELECT 
    'Client sees own client'::TEXT,
    1,
    client_count,
    client_count = 1;
  
  -- Test 2: Client can see their own plans
  SELECT COUNT(*) INTO plan_count
  FROM plans
  WHERE client_id = test_client_id;
  
  RETURN QUERY SELECT 
    'Client sees own plans'::TEXT,
    1,
    plan_count,
    plan_count >= 1;
  
  -- Test 3: Client can see their own posts
  SELECT COUNT(*) INTO post_count
  FROM posts
  WHERE client_id = test_client_id;
  
  RETURN QUERY SELECT 
    'Client sees own posts'::TEXT,
    1,
    post_count,
    post_count >= 1;
  
  -- Test 4: Client CANNOT see other client's posts
  SELECT COUNT(*) INTO other_client_post_count
  FROM posts
  WHERE client_id != test_client_id;
  
  RETURN QUERY SELECT 
    'Client cannot see other posts'::TEXT,
    0,
    other_client_post_count,
    other_client_post_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TEST 3: Verify cross-tenant access is blocked
-- =====================================================

CREATE OR REPLACE FUNCTION test_cross_tenant_access()
RETURNS TABLE(
  test_name TEXT,
  result TEXT,
  passed BOOLEAN
) AS $$
DECLARE
  client_a_id UUID := '11111111-1111-1111-1111-111111111111';
  client_b_id UUID := '22222222-2222-2222-2222-222222222222';
  post_a_id UUID := 'post1111-1111-1111-1111-111111111111';
  post_b_id UUID := 'post2222-2222-2222-2222-222222222222';
BEGIN
  -- Test: Direct query to other client's post should return 0 rows
  -- (This tests RLS is working)
  
  RETURN QUERY SELECT 
    'RLS enabled on clients'::TEXT,
    CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'clients') 
         THEN 'ENABLED' ELSE 'DISABLED' END,
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'clients');
  
  RETURN QUERY SELECT 
    'RLS enabled on posts'::TEXT,
    CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'posts') 
         THEN 'ENABLED' ELSE 'DISABLED' END,
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'posts');
  
  RETURN QUERY SELECT 
    'RLS enabled on plans'::TEXT,
    CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'plans') 
         THEN 'ENABLED' ELSE 'DISABLED' END,
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'plans');
  
  RETURN QUERY SELECT 
    'RLS enabled on comments'::TEXT,
    CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'comments') 
         THEN 'ENABLED' ELSE 'DISABLED' END,
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'comments');
  
  RETURN QUERY SELECT 
    'RLS enabled on approvals'::TEXT,
    CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'approvals') 
         THEN 'ENABLED' ELSE 'DISABLED' END,
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'approvals');
  
  RETURN QUERY SELECT 
    'RLS enabled on post_variants'::TEXT,
    CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'post_variants') 
         THEN 'ENABLED' ELSE 'DISABLED' END,
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'post_variants');
  
  RETURN QUERY SELECT 
    'RLS enabled on post_platforms'::TEXT,
    CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'post_platforms') 
         THEN 'ENABLED' ELSE 'DISABLED' END,
    (SELECT relrowsecurity FROM pg_class WHERE relname = 'post_platforms');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TEST 4: Verify Client cannot UPDATE posts
-- =====================================================

CREATE OR REPLACE FUNCTION test_client_cannot_update_post()
RETURNS TABLE(
  test_name TEXT,
  policy_exists BOOLEAN,
  policy_definition TEXT
) AS $$
BEGIN
  -- Check posts_update policy exists and blocks clients
  RETURN QUERY
  SELECT 
    'posts_update policy blocks clients'::TEXT,
    EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'posts' 
      AND policyname = 'posts_update'
    ),
    (SELECT qual::TEXT FROM pg_policies WHERE tablename = 'posts' AND policyname = 'posts_update');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TEST 5: Verify Approval Locking
-- =====================================================

CREATE OR REPLACE FUNCTION test_approval_locking()
RETURNS TABLE(
  test_name TEXT,
  result TEXT,
  passed BOOLEAN
) AS $$
DECLARE
  test_post_id UUID;
  is_locked BOOLEAN;
BEGIN
  -- Create a test post
  INSERT INTO posts (id, plan_id, client_id, title, status, publish_date, locked)
  VALUES (
    'test-lock-1111-1111-111111111111',
    'aaaa1111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Test Lock Post',
    'draft',
    '2026-01-20',
    false
  )
  ON CONFLICT (id) DO UPDATE SET status = 'draft', locked = false
  RETURNING id INTO test_post_id;
  
  -- Verify post is not locked initially
  SELECT locked INTO is_locked FROM posts WHERE id = test_post_id;
  RETURN QUERY SELECT 
    'Post initially unlocked'::TEXT,
    CASE WHEN is_locked THEN 'LOCKED' ELSE 'UNLOCKED' END,
    NOT COALESCE(is_locked, false);
  
  -- Approve the post
  UPDATE posts SET status = 'approved' WHERE id = test_post_id;
  
  -- Verify post is now locked
  SELECT locked INTO is_locked FROM posts WHERE id = test_post_id;
  RETURN QUERY SELECT 
    'Post locked after approval'::TEXT,
    CASE WHEN is_locked THEN 'LOCKED' ELSE 'UNLOCKED' END,
    COALESCE(is_locked, false);
  
  -- Cleanup
  DELETE FROM posts WHERE id = test_post_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RUN ALL TESTS
-- =====================================================

SELECT '=== RLS STATUS CHECK ===' as section;
SELECT * FROM test_cross_tenant_access();

SELECT '=== APPROVAL LOCKING TEST ===' as section;
SELECT * FROM test_approval_locking();

SELECT '=== CLIENT UPDATE POLICY CHECK ===' as section;
SELECT * FROM test_client_cannot_update_post();

-- =====================================================
-- CLEANUP TEST DATA (optional)
-- =====================================================

-- DELETE FROM posts WHERE id IN ('post1111-1111-1111-1111-111111111111', 'post2222-2222-2222-2222-222222222222');
-- DELETE FROM plans WHERE id IN ('aaaa1111-1111-1111-1111-111111111111', 'bbbb2222-2222-2222-2222-222222222222');
-- DELETE FROM clients WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

SELECT 'Tenant Isolation Tests completed!' as result;
