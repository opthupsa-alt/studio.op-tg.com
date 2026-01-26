-- =====================================================
-- Audit Log Table
-- Version: 014
-- Date: 2026-01-26
-- Purpose: Track all changes for accountability
-- =====================================================

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_role TEXT,
  
  -- What
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'approve', 'reject', 'assign', 'upload', 'download')),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  
  -- Details
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  
  -- When
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Context
  ip_address TEXT,
  user_agent TEXT
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admin/manager can view audit logs
DROP POLICY IF EXISTS "audit_log_select" ON audit_log;
CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.user_id = auth.uid()
      AND team_members.role IN ('admin', 'manager')
    )
  );

-- Anyone can insert (for logging purposes)
DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;
CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT WITH CHECK (true);

-- No updates or deletes allowed
DROP POLICY IF EXISTS "audit_log_update" ON audit_log;
DROP POLICY IF EXISTS "audit_log_delete" ON audit_log;

-- Function to log an action
CREATE OR REPLACE FUNCTION log_audit(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_role TEXT;
  v_log_id UUID;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;
  
  SELECT role INTO v_user_role
  FROM team_members
  WHERE user_id = v_user_id;
  
  -- Insert log entry
  INSERT INTO audit_log (
    user_id, user_email, user_role,
    action, entity_type, entity_id,
    old_values, new_values, metadata
  )
  VALUES (
    v_user_id, v_user_email, v_user_role,
    p_action, p_entity_type, p_entity_id,
    p_old_values, p_new_values, p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Audit Log table created successfully!' as result;
