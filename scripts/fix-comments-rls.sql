-- Fix Comments RLS Policies
-- This script ensures comments work correctly for both clients and admins

-- Drop existing policies
DROP POLICY IF EXISTS "comments_select" ON comments;
DROP POLICY IF EXISTS "comments_insert" ON comments;
DROP POLICY IF EXISTS "comments_update" ON comments;
DROP POLICY IF EXISTS "comments_delete" ON comments;
DROP POLICY IF EXISTS "comments_all" ON comments;

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- SELECT: Everyone can see client-scope comments on posts they have access to
CREATE POLICY "comments_select" ON comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM posts p 
      WHERE p.id = comments.post_id
      AND (
        -- Admin/Manager can see all posts
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.user_id = auth.uid() 
          AND tm.role IN ('admin', 'manager')
        )
        -- Client can see their own client's posts
        OR EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.user_id = auth.uid() 
          AND tm.role = 'client'
          AND tm.client_id = p.client_id
        )
      )
    )
    AND (
      -- Client can only see client-scope comments
      scope = 'client'
      -- Team (non-clients) can see all comments
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.user_id = auth.uid() 
        AND tm.role != 'client'
      )
    )
  );

-- INSERT: Anyone with post access can add comments
CREATE POLICY "comments_insert" ON comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts p 
      WHERE p.id = comments.post_id
      AND (
        -- Admin/Manager can comment on all posts
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.user_id = auth.uid() 
          AND tm.role IN ('admin', 'manager')
        )
        -- Client can comment on their own client's posts
        OR EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.user_id = auth.uid() 
          AND tm.role = 'client'
          AND tm.client_id = p.client_id
        )
      )
    )
    AND (
      -- Client can only add client-scope comments
      (
        EXISTS (
          SELECT 1 FROM team_members tm 
          WHERE tm.user_id = auth.uid() 
          AND tm.role = 'client'
        )
        AND scope = 'client'
      )
      -- Team can add any scope
      OR EXISTS (
        SELECT 1 FROM team_members tm 
        WHERE tm.user_id = auth.uid() 
        AND tm.role != 'client'
      )
    )
  );

-- UPDATE: Only own comments
CREATE POLICY "comments_update" ON comments
  FOR UPDATE USING (
    user_id IN (SELECT id FROM team_members WHERE user_id = auth.uid())
  );

-- DELETE: Own comments or admin/manager
CREATE POLICY "comments_delete" ON comments
  FOR DELETE USING (
    user_id IN (SELECT id FROM team_members WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.role IN ('admin', 'manager')
    )
  );
