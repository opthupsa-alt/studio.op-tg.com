-- =====================================================
-- Team Member Clients - Multi-tenant Assignment
-- Version: 006
-- Date: 2026-01-26
-- =====================================================
-- This script creates the team_member_clients table
-- to properly assign writers/designers to specific clients

-- =====================================================
-- 1. Create team_member_clients table
-- =====================================================
CREATE TABLE IF NOT EXISTS team_member_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_member_id, client_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_member_clients_team_member_id 
  ON team_member_clients(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_clients_client_id 
  ON team_member_clients(client_id);

-- =====================================================
-- 2. Enable RLS on team_member_clients
-- =====================================================
ALTER TABLE team_member_clients ENABLE ROW LEVEL SECURITY;

-- Select: Admin/Manager see all, others see their own assignments
DROP POLICY IF EXISTS "team_member_clients_select" ON team_member_clients;
CREATE POLICY "team_member_clients_select" ON team_member_clients
  FOR SELECT USING (
    get_user_role() IN ('admin', 'manager')
    OR team_member_id = get_user_team_member_id()
  );

-- Insert: Only admin/manager can assign
DROP POLICY IF EXISTS "team_member_clients_insert" ON team_member_clients;
CREATE POLICY "team_member_clients_insert" ON team_member_clients
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'manager')
  );

-- Delete: Only admin/manager can unassign
DROP POLICY IF EXISTS "team_member_clients_delete" ON team_member_clients;
CREATE POLICY "team_member_clients_delete" ON team_member_clients
  FOR DELETE USING (
    get_user_role() IN ('admin', 'manager')
  );

-- =====================================================
-- 3. Helper function to check client access
-- =====================================================
CREATE OR REPLACE FUNCTION user_has_client_access(check_client_id UUID)
RETURNS boolean AS $$
DECLARE
  user_role TEXT;
  user_client_id UUID;
  user_team_member_id UUID;
BEGIN
  -- Get user info
  SELECT role, client_id, id INTO user_role, user_client_id, user_team_member_id
  FROM team_members 
  WHERE user_id = auth.uid();
  
  -- Admin/Manager have access to all clients
  IF user_role IN ('admin', 'manager') THEN
    RETURN true;
  END IF;
  
  -- Client role: only their own client
  IF user_role = 'client' THEN
    RETURN user_client_id = check_client_id;
  END IF;
  
  -- Writer/Designer: check team_member_clients
  IF user_role IN ('writer', 'designer') THEN
    RETURN EXISTS (
      SELECT 1 FROM team_member_clients tmc
      WHERE tmc.team_member_id = user_team_member_id
      AND tmc.client_id = check_client_id
    );
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 4. Update RLS policies for posts
-- =====================================================
DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts
  FOR SELECT USING (
    user_has_client_access(client_id)
  );

DROP POLICY IF EXISTS "posts_insert" ON posts;
CREATE POLICY "posts_insert" ON posts
  FOR INSERT WITH CHECK (
    user_has_client_access(client_id)
    AND get_user_role() IN ('admin', 'manager', 'writer')
  );

DROP POLICY IF EXISTS "posts_update" ON posts;
CREATE POLICY "posts_update" ON posts
  FOR UPDATE USING (
    user_has_client_access(client_id)
    AND (
      -- Admin/Manager can always update
      get_user_role() IN ('admin', 'manager')
      OR (
        -- Writer/Designer can update if not locked
        get_user_role() IN ('writer', 'designer')
        AND NOT locked
      )
    )
  );

DROP POLICY IF EXISTS "posts_delete" ON posts;
CREATE POLICY "posts_delete" ON posts
  FOR DELETE USING (
    user_has_client_access(client_id)
    AND get_user_role() IN ('admin', 'manager')
  );

-- =====================================================
-- 5. Update RLS policies for plans
-- =====================================================
DROP POLICY IF EXISTS "plans_select" ON plans;
CREATE POLICY "plans_select" ON plans
  FOR SELECT USING (
    user_has_client_access(client_id)
  );

DROP POLICY IF EXISTS "plans_insert" ON plans;
CREATE POLICY "plans_insert" ON plans
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'manager')
  );

DROP POLICY IF EXISTS "plans_update" ON plans;
CREATE POLICY "plans_update" ON plans
  FOR UPDATE USING (
    get_user_role() IN ('admin', 'manager')
  );

DROP POLICY IF EXISTS "plans_delete" ON plans;
CREATE POLICY "plans_delete" ON plans
  FOR DELETE USING (
    get_user_role() = 'admin'
  );

-- =====================================================
-- 6. Update RLS policies for clients
-- =====================================================
DROP POLICY IF EXISTS "clients_select" ON clients;
CREATE POLICY "clients_select" ON clients
  FOR SELECT USING (
    user_has_client_access(id)
  );

-- =====================================================
-- 7. Update RLS policies for post_platforms
-- =====================================================
DROP POLICY IF EXISTS "post_platforms_select" ON post_platforms;
CREATE POLICY "post_platforms_select" ON post_platforms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_platforms.post_id
      AND user_has_client_access(posts.client_id)
    )
  );

-- =====================================================
-- 8. Update RLS policies for post_variants
-- =====================================================
DROP POLICY IF EXISTS "post_variants_select" ON post_variants;
CREATE POLICY "post_variants_select" ON post_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_variants.post_id
      AND user_has_client_access(posts.client_id)
    )
  );

-- =====================================================
-- 9. Update RLS policies for comments
-- =====================================================
DROP POLICY IF EXISTS "comments_select" ON comments;
CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = comments.post_id
      AND user_has_client_access(posts.client_id)
      AND (
        -- Team sees all comments
        get_user_role() IN ('admin', 'manager', 'writer', 'designer')
        -- Client sees only client-scope comments
        OR (get_user_role() = 'client' AND comments.scope = 'client')
      )
    )
  );

-- =====================================================
-- 10. Update RLS policies for approvals
-- =====================================================
DROP POLICY IF EXISTS "approvals_select" ON approvals;
CREATE POLICY "approvals_select" ON approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = approvals.post_id
      AND user_has_client_access(posts.client_id)
    )
  );

-- =====================================================
-- 11. Update RLS policies for assets
-- =====================================================
DROP POLICY IF EXISTS "assets_select" ON assets;
CREATE POLICY "assets_select" ON assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = assets.post_id
      AND user_has_client_access(posts.client_id)
    )
  );

-- =====================================================
-- Done!
-- =====================================================
SELECT 'Team Member Clients table and updated RLS policies created successfully!' as result;
