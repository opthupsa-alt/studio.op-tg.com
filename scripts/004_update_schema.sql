-- =====================================================
-- Migration: Update Schema for Full Backend Support
-- Version: 004
-- Date: 2026-01-26
-- =====================================================
-- This migration is IDEMPOTENT - safe to run multiple times

-- =====================================================
-- 1. Add missing columns to posts table
-- =====================================================

-- Add description column for preview
ALTER TABLE posts ADD COLUMN IF NOT EXISTS description text;

-- Add post_type column with check constraint
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'post_type') THEN
    ALTER TABLE posts ADD COLUMN post_type text NOT NULL DEFAULT 'post';
  END IF;
END $$;

-- Add check constraint for post_type if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_post_type_check') THEN
    ALTER TABLE posts ADD CONSTRAINT posts_post_type_check 
      CHECK (post_type IN ('post', 'reel', 'video', 'story', 'carousel'));
  END IF;
END $$;

-- Add assigned_writer column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS assigned_writer uuid REFERENCES team_members(id);

-- Add assigned_designer column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS assigned_designer uuid REFERENCES team_members(id);

-- Add created_by column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES team_members(id);

-- Add locked column
ALTER TABLE posts ADD COLUMN IF NOT EXISTS locked boolean DEFAULT false;

-- =====================================================
-- 2. Update status check constraint
-- =====================================================
-- Drop old constraint if exists and create new one with full workflow states
DO $$
BEGIN
  -- Try to drop old constraint
  ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Add new status constraint with all workflow states
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_status_check_v2') THEN
    ALTER TABLE posts ADD CONSTRAINT posts_status_check_v2 
      CHECK (status IN ('idea', 'draft', 'design', 'internal_review', 'client_review', 'approved', 'rejected', 'scheduled', 'posted'));
  END IF;
END $$;

-- =====================================================
-- 3. Update main_goal check constraint
-- =====================================================
DO $$
BEGIN
  ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_main_goal_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_main_goal_check_v2') THEN
    ALTER TABLE posts ADD CONSTRAINT posts_main_goal_check_v2 
      CHECK (main_goal IN ('awareness', 'engagement', 'leads', 'messages', 'sales'));
  END IF;
END $$;

-- =====================================================
-- 4. Add indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_posts_client_id ON posts(client_id);
CREATE INDEX IF NOT EXISTS idx_posts_plan_id ON posts(plan_id);
CREATE INDEX IF NOT EXISTS idx_posts_publish_date ON posts(publish_date);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);
CREATE INDEX IF NOT EXISTS idx_posts_assigned_writer ON posts(assigned_writer);
CREATE INDEX IF NOT EXISTS idx_posts_assigned_designer ON posts(assigned_designer);

-- =====================================================
-- 5. Update comments table - add comment column if using different name
-- =====================================================
-- Rename 'content' to 'comment' if needed (check existing schema)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'content') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'comment') THEN
    ALTER TABLE comments RENAME COLUMN content TO comment;
  END IF;
END $$;

-- Add comment column if not exists
ALTER TABLE comments ADD COLUMN IF NOT EXISTS comment text;

-- =====================================================
-- 6. Update approvals table
-- =====================================================
-- Add client_user_id if not exists (may be named differently)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'approvals' AND column_name = 'client_user_id') THEN
    ALTER TABLE approvals ADD COLUMN client_user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Update status constraint for approvals
DO $$
BEGIN
  ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_status_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'approvals_status_check_v2') THEN
    ALTER TABLE approvals ADD CONSTRAINT approvals_status_check_v2 
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- =====================================================
-- 7. Create helper function for workflow validation
-- =====================================================
CREATE OR REPLACE FUNCTION validate_status_transition(old_status text, new_status text)
RETURNS boolean AS $$
DECLARE
  valid_transitions jsonb := '{
    "idea": ["draft"],
    "draft": ["design", "idea"],
    "design": ["internal_review", "draft"],
    "internal_review": ["client_review", "design"],
    "client_review": ["approved", "rejected", "internal_review"],
    "approved": ["scheduled"],
    "rejected": ["draft"],
    "scheduled": ["posted", "approved"],
    "posted": []
  }'::jsonb;
  allowed_next jsonb;
BEGIN
  -- Allow same status (no change)
  IF old_status = new_status THEN
    RETURN true;
  END IF;
  
  -- Get allowed transitions
  allowed_next := valid_transitions -> old_status;
  
  -- Check if new_status is in allowed list
  RETURN allowed_next ? new_status;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 8. Create trigger for workflow validation (optional - can be enforced in app)
-- =====================================================
CREATE OR REPLACE FUNCTION check_post_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip validation for new posts
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Validate transition
  IF NOT validate_status_transition(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
  
  -- Auto-lock on approval
  IF NEW.status = 'approved' THEN
    NEW.locked := true;
  END IF;
  
  -- Auto-unlock on rejection
  IF NEW.status = 'rejected' THEN
    NEW.locked := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_check_post_status ON posts;
CREATE TRIGGER trigger_check_post_status
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION check_post_status_transition();

-- =====================================================
-- 9. Create function for auto-creating plans
-- =====================================================
CREATE OR REPLACE FUNCTION get_or_create_plan(
  p_client_id uuid,
  p_year int,
  p_month int
) RETURNS uuid AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  -- Try to find existing plan
  SELECT id INTO v_plan_id
  FROM plans
  WHERE client_id = p_client_id AND year = p_year AND month = p_month;
  
  -- If not found, create it
  IF v_plan_id IS NULL THEN
    INSERT INTO plans (client_id, year, month, status)
    VALUES (p_client_id, p_year, p_month, 'active')
    RETURNING id INTO v_plan_id;
  END IF;
  
  RETURN v_plan_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. Create function for client approval
-- =====================================================
CREATE OR REPLACE FUNCTION approve_post(
  p_post_id uuid,
  p_user_id uuid,
  p_approved boolean,
  p_note text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Upsert approval record
  INSERT INTO approvals (post_id, client_user_id, status, note)
  VALUES (
    p_post_id, 
    p_user_id, 
    CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
    p_note
  )
  ON CONFLICT (post_id) DO UPDATE SET
    status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
    note = COALESCE(p_note, approvals.note),
    client_user_id = p_user_id,
    created_at = now();
  
  -- Update post status
  UPDATE posts SET
    status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
    locked = p_approved
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Done!
-- =====================================================
SELECT 'Migration 004 completed successfully!' as result;
