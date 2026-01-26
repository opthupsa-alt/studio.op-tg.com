-- =====================================================
-- Complete RLS Policies for Production
-- Version: 009
-- Date: 2026-01-26
-- Purpose: Full Tenant Isolation + Role-Based Access Control
-- =====================================================

-- =====================================================
-- STEP 1: Enable RLS on ALL tables
-- =====================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;

-- Enable RLS on assets if exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets') THEN
    EXECUTE 'ALTER TABLE assets ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Enable RLS on team_member_clients if exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_member_clients') THEN
    EXECUTE 'ALTER TABLE team_member_clients ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Enable RLS on notifications if exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    EXECUTE 'ALTER TABLE notifications ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- =====================================================
-- STEP 2: Helper Functions
-- =====================================================

-- Function to get current user's team_member record
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

-- Function to check if user is admin or manager
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM team_members
  WHERE user_id = auth.uid();
  
  RETURN user_role IN ('admin', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is client
CREATE OR REPLACE FUNCTION is_client_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM team_members
  WHERE user_id = auth.uid();
  
  RETURN user_role = 'client';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get user's accessible client IDs
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
  
  -- Admin/Manager can see all clients
  IF user_role IN ('admin', 'manager') THEN
    RETURN QUERY SELECT c.id FROM clients c;
  -- Client user can only see their own client
  ELSIF user_role = 'client' AND user_client_id IS NOT NULL THEN
    RETURN QUERY SELECT user_client_id;
  -- Writer/Designer can see clients they're assigned to
  ELSE
    RETURN QUERY 
    SELECT DISTINCT tmc.client_id 
    FROM team_member_clients tmc 
    WHERE tmc.team_member_id = user_team_member_id
    UNION
    SELECT DISTINCT p.client_id 
    FROM posts p 
    WHERE p.assigned_writer = user_team_member_id 
       OR p.assigned_designer = user_team_member_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 3: Drop ALL existing policies (clean slate)
-- =====================================================

-- Clients
DROP POLICY IF EXISTS "clients_select" ON clients;
DROP POLICY IF EXISTS "clients_insert" ON clients;
DROP POLICY IF EXISTS "clients_update" ON clients;
DROP POLICY IF EXISTS "clients_delete" ON clients;
DROP POLICY IF EXISTS "clients_all" ON clients;

-- Team Members
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;
DROP POLICY IF EXISTS "team_members_all" ON team_members;

-- Plans
DROP POLICY IF EXISTS "plans_select" ON plans;
DROP POLICY IF EXISTS "plans_insert" ON plans;
DROP POLICY IF EXISTS "plans_update" ON plans;
DROP POLICY IF EXISTS "plans_delete" ON plans;
DROP POLICY IF EXISTS "plans_all" ON plans;

-- Posts
DROP POLICY IF EXISTS "posts_select" ON posts;
DROP POLICY IF EXISTS "posts_insert" ON posts;
DROP POLICY IF EXISTS "posts_update" ON posts;
DROP POLICY IF EXISTS "posts_delete" ON posts;
DROP POLICY IF EXISTS "posts_all" ON posts;

-- Post Platforms
DROP POLICY IF EXISTS "post_platforms_select" ON post_platforms;
DROP POLICY IF EXISTS "post_platforms_insert" ON post_platforms;
DROP POLICY IF EXISTS "post_platforms_update" ON post_platforms;
DROP POLICY IF EXISTS "post_platforms_delete" ON post_platforms;
DROP POLICY IF EXISTS "post_platforms_all" ON post_platforms;

-- Post Variants
DROP POLICY IF EXISTS "post_variants_select" ON post_variants;
DROP POLICY IF EXISTS "post_variants_insert" ON post_variants;
DROP POLICY IF EXISTS "post_variants_update" ON post_variants;
DROP POLICY IF EXISTS "post_variants_delete" ON post_variants;
DROP POLICY IF EXISTS "post_variants_all" ON post_variants;

-- Comments
DROP POLICY IF EXISTS "comments_select" ON comments;
DROP POLICY IF EXISTS "comments_insert" ON comments;
DROP POLICY IF EXISTS "comments_update" ON comments;
DROP POLICY IF EXISTS "comments_delete" ON comments;
DROP POLICY IF EXISTS "comments_all" ON comments;

-- Approvals
DROP POLICY IF EXISTS "approvals_select" ON approvals;
DROP POLICY IF EXISTS "approvals_insert" ON approvals;
DROP POLICY IF EXISTS "approvals_update" ON approvals;
DROP POLICY IF EXISTS "approvals_delete" ON approvals;
DROP POLICY IF EXISTS "approvals_all" ON approvals;

-- Platforms (read-only for all)
DROP POLICY IF EXISTS "platforms_select" ON platforms;
DROP POLICY IF EXISTS "platforms_all" ON platforms;

-- =====================================================
-- STEP 4: CLIENTS table policies
-- =====================================================

-- SELECT: Users can only see clients they have access to
CREATE POLICY "clients_select" ON clients
  FOR SELECT USING (
    id IN (SELECT get_user_client_ids())
  );

-- INSERT: Only admin can create clients
CREATE POLICY "clients_insert" ON clients
  FOR INSERT WITH CHECK (
    is_admin_or_manager()
  );

-- UPDATE: Only admin can update clients
CREATE POLICY "clients_update" ON clients
  FOR UPDATE USING (
    is_admin_or_manager()
  );

-- DELETE: Only admin can delete clients
CREATE POLICY "clients_delete" ON clients
  FOR DELETE USING (
    is_admin_or_manager()
  );

-- =====================================================
-- STEP 5: TEAM_MEMBERS table policies
-- =====================================================

-- SELECT: Admin/Manager see all, others see themselves + same client
CREATE POLICY "team_members_select" ON team_members
  FOR SELECT USING (
    is_admin_or_manager()
    OR user_id = auth.uid()
    OR (
      client_id IS NOT NULL 
      AND client_id IN (SELECT get_user_client_ids())
    )
  );

-- INSERT: Only admin can create team members
CREATE POLICY "team_members_insert" ON team_members
  FOR INSERT WITH CHECK (
    is_admin_or_manager()
  );

-- UPDATE: Admin can update all, users can update themselves
CREATE POLICY "team_members_update" ON team_members
  FOR UPDATE USING (
    is_admin_or_manager()
    OR user_id = auth.uid()
  );

-- DELETE: Only admin can delete team members
CREATE POLICY "team_members_delete" ON team_members
  FOR DELETE USING (
    is_admin_or_manager()
  );

-- =====================================================
-- STEP 6: PLANS table policies
-- =====================================================

-- SELECT: Users can only see plans for their accessible clients
CREATE POLICY "plans_select" ON plans
  FOR SELECT USING (
    client_id IN (SELECT get_user_client_ids())
  );

-- INSERT: Only admin/manager can create plans
CREATE POLICY "plans_insert" ON plans
  FOR INSERT WITH CHECK (
    is_admin_or_manager()
  );

-- UPDATE: Only admin/manager can update plans
CREATE POLICY "plans_update" ON plans
  FOR UPDATE USING (
    is_admin_or_manager()
  );

-- DELETE: Only admin/manager can delete plans
CREATE POLICY "plans_delete" ON plans
  FOR DELETE USING (
    is_admin_or_manager()
  );

-- =====================================================
-- STEP 7: POSTS table policies (CRITICAL)
-- =====================================================

-- SELECT: Users can only see posts for their accessible clients
CREATE POLICY "posts_select" ON posts
  FOR SELECT USING (
    client_id IN (SELECT get_user_client_ids())
  );

-- INSERT: Admin/Manager/Writer can create posts (not clients)
CREATE POLICY "posts_insert" ON posts
  FOR INSERT WITH CHECK (
    NOT is_client_user()
    AND client_id IN (SELECT get_user_client_ids())
  );

-- UPDATE: Complex rules based on role and lock status
-- Admin/Manager: can update any post
-- Writer/Designer: can update unlocked posts assigned to them
-- Client: CANNOT update posts (only approve/reject via approvals)
CREATE POLICY "posts_update" ON posts
  FOR UPDATE USING (
    -- Client cannot update posts at all
    NOT is_client_user()
    AND client_id IN (SELECT get_user_client_ids())
    AND (
      -- Admin/Manager can always update
      is_admin_or_manager()
      OR (
        -- Writer/Designer can only update unlocked posts
        (locked IS NULL OR locked = false)
        AND (
          assigned_writer = (SELECT id FROM team_members WHERE user_id = auth.uid())
          OR assigned_designer = (SELECT id FROM team_members WHERE user_id = auth.uid())
        )
      )
    )
  );

-- DELETE: Only admin/manager can delete posts
CREATE POLICY "posts_delete" ON posts
  FOR DELETE USING (
    is_admin_or_manager()
  );

-- =====================================================
-- STEP 8: POST_PLATFORMS table policies
-- =====================================================

-- SELECT: Based on post access
CREATE POLICY "post_platforms_select" ON post_platforms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p 
      WHERE p.id = post_id 
      AND p.client_id IN (SELECT get_user_client_ids())
    )
  );

-- INSERT: Not client
CREATE POLICY "post_platforms_insert" ON post_platforms
  FOR INSERT WITH CHECK (
    NOT is_client_user()
    AND EXISTS (
      SELECT 1 FROM posts p 
      WHERE p.id = post_id 
      AND p.client_id IN (SELECT get_user_client_ids())
    )
  );

-- UPDATE: Not client
CREATE POLICY "post_platforms_update" ON post_platforms
  FOR UPDATE USING (
    NOT is_client_user()
    AND EXISTS (
      SELECT 1 FROM posts p 
      WHERE p.id = post_id 
      AND p.client_id IN (SELECT get_user_client_ids())
    )
  );

-- DELETE: Admin/Manager only
CREATE POLICY "post_platforms_delete" ON post_platforms
  FOR DELETE USING (
    is_admin_or_manager()
  );

-- =====================================================
-- STEP 9: POST_VARIANTS table policies
-- =====================================================

-- SELECT: Based on post access
CREATE POLICY "post_variants_select" ON post_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p 
      WHERE p.id = post_id 
      AND p.client_id IN (SELECT get_user_client_ids())
    )
  );

-- INSERT: Not client, post not locked
CREATE POLICY "post_variants_insert" ON post_variants
  FOR INSERT WITH CHECK (
    NOT is_client_user()
    AND EXISTS (
      SELECT 1 FROM posts p 
      WHERE p.id = post_id 
      AND p.client_id IN (SELECT get_user_client_ids())
      AND (p.locked IS NULL OR p.locked = false)
    )
  );

-- UPDATE: Not client, post not locked
CREATE POLICY "post_variants_update" ON post_variants
  FOR UPDATE USING (
    NOT is_client_user()
    AND EXISTS (
      SELECT 1 FROM posts p 
      WHERE p.id = post_id 
      AND p.client_id IN (SELECT get_user_client_ids())
      AND (p.locked IS NULL OR p.locked = false)
    )
  );

-- DELETE: Admin/Manager only
CREATE POLICY "post_variants_delete" ON post_variants
  FOR DELETE USING (
    is_admin_or_manager()
  );

-- =====================================================
-- STEP 10: COMMENTS table policies
-- =====================================================

-- SELECT: Based on post access + scope rules
-- Internal comments: only team (not clients)
-- Client comments: everyone with post access
CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p 
      WHERE p.id = post_id 
      AND p.client_id IN (SELECT get_user_client_ids())
    )
    AND (
      -- Client can only see client-scope comments
      (is_client_user() AND scope = 'client')
      -- Team can see all comments
      OR NOT is_client_user()
    )
  );

-- INSERT: Anyone with post access can add comments
-- Client can only add client-scope comments
CREATE POLICY "comments_insert" ON comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts p 
      WHERE p.id = post_id 
      AND p.client_id IN (SELECT get_user_client_ids())
    )
    AND (
      -- Client can only add client-scope comments
      (is_client_user() AND scope = 'client')
      -- Team can add any scope
      OR NOT is_client_user()
    )
  );

-- UPDATE: Only own comments
CREATE POLICY "comments_update" ON comments
  FOR UPDATE USING (
    user_id = (SELECT id FROM team_members WHERE user_id = auth.uid())
  );

-- DELETE: Own comments or admin
CREATE POLICY "comments_delete" ON comments
  FOR DELETE USING (
    user_id = (SELECT id FROM team_members WHERE user_id = auth.uid())
    OR is_admin_or_manager()
  );

-- =====================================================
-- STEP 11: APPROVALS table policies
-- =====================================================

-- SELECT: Based on post access
CREATE POLICY "approvals_select" ON approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p 
      WHERE p.id = post_id 
      AND p.client_id IN (SELECT get_user_client_ids())
    )
  );

-- INSERT: Client can approve/reject, Admin/Manager can too
CREATE POLICY "approvals_insert" ON approvals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts p 
      WHERE p.id = post_id 
      AND p.client_id IN (SELECT get_user_client_ids())
    )
    AND (is_client_user() OR is_admin_or_manager())
  );

-- UPDATE: Only own approvals
CREATE POLICY "approvals_update" ON approvals
  FOR UPDATE USING (
    client_user_id = auth.uid()
    OR is_admin_or_manager()
  );

-- DELETE: Admin only
CREATE POLICY "approvals_delete" ON approvals
  FOR DELETE USING (
    is_admin_or_manager()
  );

-- =====================================================
-- STEP 12: PLATFORMS table policies (read-only for all)
-- =====================================================

CREATE POLICY "platforms_select" ON platforms
  FOR SELECT USING (true);

-- =====================================================
-- STEP 13: ASSETS table policies (if exists)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets') THEN
    -- Drop existing
    DROP POLICY IF EXISTS "assets_select" ON assets;
    DROP POLICY IF EXISTS "assets_insert" ON assets;
    DROP POLICY IF EXISTS "assets_update" ON assets;
    DROP POLICY IF EXISTS "assets_delete" ON assets;
    
    -- SELECT: Based on post access
    EXECUTE 'CREATE POLICY "assets_select" ON assets
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM posts p 
          WHERE p.id = post_id 
          AND p.client_id IN (SELECT get_user_client_ids())
        )
      )';
    
    -- INSERT: Not client, post not locked
    EXECUTE 'CREATE POLICY "assets_insert" ON assets
      FOR INSERT WITH CHECK (
        NOT is_client_user()
        AND EXISTS (
          SELECT 1 FROM posts p 
          WHERE p.id = post_id 
          AND p.client_id IN (SELECT get_user_client_ids())
          AND (p.locked IS NULL OR p.locked = false)
        )
      )';
    
    -- UPDATE: Not client
    EXECUTE 'CREATE POLICY "assets_update" ON assets
      FOR UPDATE USING (
        NOT is_client_user()
        AND EXISTS (
          SELECT 1 FROM posts p 
          WHERE p.id = post_id 
          AND p.client_id IN (SELECT get_user_client_ids())
        )
      )';
    
    -- DELETE: Admin/Manager only
    EXECUTE 'CREATE POLICY "assets_delete" ON assets
      FOR DELETE USING (
        is_admin_or_manager()
      )';
  END IF;
END $$;

-- =====================================================
-- STEP 14: NOTIFICATIONS table policies (if exists)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    DROP POLICY IF EXISTS "notifications_select" ON notifications;
    DROP POLICY IF EXISTS "notifications_insert" ON notifications;
    DROP POLICY IF EXISTS "notifications_update" ON notifications;
    DROP POLICY IF EXISTS "notifications_delete" ON notifications;
    
    EXECUTE 'CREATE POLICY "notifications_select" ON notifications
      FOR SELECT USING (user_id = auth.uid())';
    
    EXECUTE 'CREATE POLICY "notifications_insert" ON notifications
      FOR INSERT WITH CHECK (true)';
    
    EXECUTE 'CREATE POLICY "notifications_update" ON notifications
      FOR UPDATE USING (user_id = auth.uid())';
    
    EXECUTE 'CREATE POLICY "notifications_delete" ON notifications
      FOR DELETE USING (user_id = auth.uid())';
  END IF;
END $$;

-- =====================================================
-- STEP 15: TEAM_MEMBER_CLIENTS table policies (if exists)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_member_clients') THEN
    DROP POLICY IF EXISTS "team_member_clients_select" ON team_member_clients;
    DROP POLICY IF EXISTS "team_member_clients_insert" ON team_member_clients;
    DROP POLICY IF EXISTS "team_member_clients_delete" ON team_member_clients;
    
    EXECUTE 'CREATE POLICY "team_member_clients_select" ON team_member_clients
      FOR SELECT USING (
        is_admin_or_manager()
        OR team_member_id = (SELECT id FROM team_members WHERE user_id = auth.uid())
      )';
    
    EXECUTE 'CREATE POLICY "team_member_clients_insert" ON team_member_clients
      FOR INSERT WITH CHECK (is_admin_or_manager())';
    
    EXECUTE 'CREATE POLICY "team_member_clients_delete" ON team_member_clients
      FOR DELETE USING (is_admin_or_manager())';
  END IF;
END $$;

-- =====================================================
-- STEP 16: Add locked column to posts if not exists
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'locked'
  ) THEN
    ALTER TABLE posts ADD COLUMN locked BOOLEAN DEFAULT false;
  END IF;
END $$;

-- =====================================================
-- STEP 17: Trigger to auto-lock posts on approval
-- =====================================================

CREATE OR REPLACE FUNCTION lock_post_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    NEW.locked := true;
  END IF;
  
  -- Only admin/manager can unlock by setting status back to draft
  IF OLD.locked = true AND NEW.locked = false THEN
    IF NOT is_admin_or_manager() THEN
      RAISE EXCEPTION 'Only admin or manager can unlock posts';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS post_approval_lock ON posts;
CREATE TRIGGER post_approval_lock
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION lock_post_on_approval();

-- =====================================================
-- DONE!
-- =====================================================

SELECT 'Complete RLS Policies applied successfully!' as result;
