-- =====================================================
-- RLS Policies for Content Planning Platform
-- Version: 005
-- Date: 2026-01-26
-- =====================================================
-- This script is IDEMPOTENT - safe to run multiple times

-- =====================================================
-- Helper function to get current user's role and client_id
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM team_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS uuid AS $$
  SELECT client_id FROM team_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_team_member_id()
RETURNS uuid AS $$
  SELECT id FROM team_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS boolean AS $$
  SELECT get_user_role() IN ('admin', 'manager');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- 1. PLATFORMS - Public read, admin write
-- =====================================================
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platforms_select" ON platforms;
CREATE POLICY "platforms_select" ON platforms
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "platforms_insert" ON platforms;
CREATE POLICY "platforms_insert" ON platforms
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "platforms_update" ON platforms;
CREATE POLICY "platforms_update" ON platforms
  FOR UPDATE USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "platforms_delete" ON platforms;
CREATE POLICY "platforms_delete" ON platforms
  FOR DELETE USING (get_user_role() = 'admin');

-- =====================================================
-- 2. CLIENTS - Based on role and assignment
-- =====================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_select" ON clients;
CREATE POLICY "clients_select" ON clients
  FOR SELECT USING (
    get_user_role() IN ('admin', 'manager')
    OR id = get_user_client_id()
  );

DROP POLICY IF EXISTS "clients_insert" ON clients;
CREATE POLICY "clients_insert" ON clients
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "clients_update" ON clients;
CREATE POLICY "clients_update" ON clients
  FOR UPDATE USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "clients_delete" ON clients;
CREATE POLICY "clients_delete" ON clients
  FOR DELETE USING (get_user_role() = 'admin');

-- =====================================================
-- 3. TEAM_MEMBERS - Based on role
-- =====================================================
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_select" ON team_members;
CREATE POLICY "team_members_select" ON team_members
  FOR SELECT USING (
    get_user_role() IN ('admin', 'manager')
    OR user_id = auth.uid()
    OR client_id = get_user_client_id()
  );

DROP POLICY IF EXISTS "team_members_insert" ON team_members;
CREATE POLICY "team_members_insert" ON team_members
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS "team_members_update" ON team_members;
CREATE POLICY "team_members_update" ON team_members
  FOR UPDATE USING (
    get_user_role() = 'admin'
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "team_members_delete" ON team_members;
CREATE POLICY "team_members_delete" ON team_members
  FOR DELETE USING (get_user_role() = 'admin');

-- =====================================================
-- 4. PLANS - Based on client access
-- =====================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_select" ON plans;
CREATE POLICY "plans_select" ON plans
  FOR SELECT USING (
    get_user_role() IN ('admin', 'manager', 'writer', 'designer')
    OR client_id = get_user_client_id()
  );

DROP POLICY IF EXISTS "plans_insert" ON plans;
CREATE POLICY "plans_insert" ON plans
  FOR INSERT WITH CHECK (is_admin_or_manager());

DROP POLICY IF EXISTS "plans_update" ON plans;
CREATE POLICY "plans_update" ON plans
  FOR UPDATE USING (is_admin_or_manager());

DROP POLICY IF EXISTS "plans_delete" ON plans;
CREATE POLICY "plans_delete" ON plans
  FOR DELETE USING (get_user_role() = 'admin');

-- =====================================================
-- 5. POSTS - Complex rules based on role and assignment
-- =====================================================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- SELECT: Everyone can read posts they have access to
DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts
  FOR SELECT USING (
    get_user_role() IN ('admin', 'manager', 'writer', 'designer')
    OR client_id = get_user_client_id()
  );

-- INSERT: Admin/Manager can create, writers/designers can create if assigned
DROP POLICY IF EXISTS "posts_insert" ON posts;
CREATE POLICY "posts_insert" ON posts
  FOR INSERT WITH CHECK (
    is_admin_or_manager()
    OR (
      get_user_role() IN ('writer', 'designer')
      AND (
        assigned_writer = get_user_team_member_id()
        OR assigned_designer = get_user_team_member_id()
        OR created_by = get_user_team_member_id()
      )
    )
  );

-- UPDATE: Complex rules
DROP POLICY IF EXISTS "posts_update" ON posts;
CREATE POLICY "posts_update" ON posts
  FOR UPDATE USING (
    -- Admin/Manager can always update
    is_admin_or_manager()
    OR (
      -- Writer/Designer can update if assigned and not locked
      get_user_role() IN ('writer', 'designer')
      AND NOT locked
      AND (
        assigned_writer = get_user_team_member_id()
        OR assigned_designer = get_user_team_member_id()
      )
    )
  );

-- DELETE: Only admin/manager
DROP POLICY IF EXISTS "posts_delete" ON posts;
CREATE POLICY "posts_delete" ON posts
  FOR DELETE USING (is_admin_or_manager());

-- =====================================================
-- 6. POST_PLATFORMS - Follow post access
-- =====================================================
ALTER TABLE post_platforms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_platforms_select" ON post_platforms;
CREATE POLICY "post_platforms_select" ON post_platforms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts WHERE posts.id = post_platforms.post_id
    )
  );

DROP POLICY IF EXISTS "post_platforms_insert" ON post_platforms;
CREATE POLICY "post_platforms_insert" ON post_platforms
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_platforms.post_id
      AND (
        is_admin_or_manager()
        OR (NOT posts.locked AND (
          posts.assigned_writer = get_user_team_member_id()
          OR posts.assigned_designer = get_user_team_member_id()
        ))
      )
    )
  );

DROP POLICY IF EXISTS "post_platforms_delete" ON post_platforms;
CREATE POLICY "post_platforms_delete" ON post_platforms
  FOR DELETE USING (is_admin_or_manager());

-- =====================================================
-- 7. POST_VARIANTS - Follow post access
-- =====================================================
ALTER TABLE post_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_variants_select" ON post_variants;
CREATE POLICY "post_variants_select" ON post_variants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts WHERE posts.id = post_variants.post_id
    )
  );

DROP POLICY IF EXISTS "post_variants_insert" ON post_variants;
CREATE POLICY "post_variants_insert" ON post_variants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_variants.post_id
      AND (
        is_admin_or_manager()
        OR (NOT posts.locked AND (
          posts.assigned_writer = get_user_team_member_id()
          OR posts.assigned_designer = get_user_team_member_id()
        ))
      )
    )
  );

DROP POLICY IF EXISTS "post_variants_update" ON post_variants;
CREATE POLICY "post_variants_update" ON post_variants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_variants.post_id
      AND (
        is_admin_or_manager()
        OR (NOT posts.locked AND (
          posts.assigned_writer = get_user_team_member_id()
          OR posts.assigned_designer = get_user_team_member_id()
        ))
      )
    )
  );

DROP POLICY IF EXISTS "post_variants_delete" ON post_variants;
CREATE POLICY "post_variants_delete" ON post_variants
  FOR DELETE USING (is_admin_or_manager());

-- =====================================================
-- 8. ASSETS - Follow post access
-- =====================================================
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assets_select" ON assets;
CREATE POLICY "assets_select" ON assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts WHERE posts.id = assets.post_id
    )
  );

DROP POLICY IF EXISTS "assets_insert" ON assets;
CREATE POLICY "assets_insert" ON assets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = assets.post_id
      AND (
        is_admin_or_manager()
        OR (NOT posts.locked AND (
          posts.assigned_writer = get_user_team_member_id()
          OR posts.assigned_designer = get_user_team_member_id()
        ))
      )
    )
  );

DROP POLICY IF EXISTS "assets_delete" ON assets;
CREATE POLICY "assets_delete" ON assets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = assets.post_id
      AND is_admin_or_manager()
    )
  );

-- =====================================================
-- 9. COMMENTS - Role-based access
-- =====================================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select" ON comments;
CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (
    -- Admin/Manager/Writer/Designer see all comments
    get_user_role() IN ('admin', 'manager', 'writer', 'designer')
    OR (
      -- Clients only see client-scope comments
      get_user_role() = 'client'
      AND scope = 'client'
      AND EXISTS (
        SELECT 1 FROM posts 
        WHERE posts.id = comments.post_id 
        AND posts.client_id = get_user_client_id()
      )
    )
  );

DROP POLICY IF EXISTS "comments_insert" ON comments;
CREATE POLICY "comments_insert" ON comments
  FOR INSERT WITH CHECK (
    -- Team members can add internal or client comments
    (get_user_role() IN ('admin', 'manager', 'writer', 'designer'))
    OR (
      -- Clients can only add client-scope comments
      get_user_role() = 'client'
      AND scope = 'client'
      AND EXISTS (
        SELECT 1 FROM posts 
        WHERE posts.id = comments.post_id 
        AND posts.client_id = get_user_client_id()
      )
    )
  );

DROP POLICY IF EXISTS "comments_delete" ON comments;
CREATE POLICY "comments_delete" ON comments
  FOR DELETE USING (
    user_id = auth.uid() OR is_admin_or_manager()
  );

-- =====================================================
-- 10. APPROVALS - Client can approve/reject
-- =====================================================
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approvals_select" ON approvals;
CREATE POLICY "approvals_select" ON approvals
  FOR SELECT USING (
    get_user_role() IN ('admin', 'manager', 'writer', 'designer')
    OR EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = approvals.post_id 
      AND posts.client_id = get_user_client_id()
    )
  );

DROP POLICY IF EXISTS "approvals_insert" ON approvals;
CREATE POLICY "approvals_insert" ON approvals
  FOR INSERT WITH CHECK (
    -- Only clients can create approvals for their posts
    get_user_role() = 'client'
    AND EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = approvals.post_id 
      AND posts.client_id = get_user_client_id()
      AND posts.status = 'client_review'
    )
  );

DROP POLICY IF EXISTS "approvals_update" ON approvals;
CREATE POLICY "approvals_update" ON approvals
  FOR UPDATE USING (
    get_user_role() = 'client'
    AND EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = approvals.post_id 
      AND posts.client_id = get_user_client_id()
    )
  );

-- =====================================================
-- Done!
-- =====================================================
SELECT 'RLS Policies created successfully!' as result;
