-- =====================================================
-- Protect Super Admin from Deletion
-- Version: 015
-- Date: 2026-01-26
-- =====================================================

-- Add is_protected column if not exists
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS is_protected BOOLEAN DEFAULT false;

-- Create trigger to prevent deletion of protected users
CREATE OR REPLACE FUNCTION prevent_protected_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_protected = true THEN
    RAISE EXCEPTION 'Cannot delete protected Super Admin account';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS protect_super_admin_delete ON team_members;

-- Create trigger
CREATE TRIGGER protect_super_admin_delete
  BEFORE DELETE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION prevent_protected_user_deletion();

-- Create trigger to prevent role change of protected users
CREATE OR REPLACE FUNCTION prevent_protected_user_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_protected = true AND NEW.role != 'admin' THEN
    RAISE EXCEPTION 'Cannot change role of protected Super Admin account';
  END IF;
  IF OLD.is_protected = true AND NEW.is_protected = false THEN
    RAISE EXCEPTION 'Cannot remove protection from Super Admin account';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS protect_super_admin_update ON team_members;

-- Create trigger
CREATE TRIGGER protect_super_admin_update
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION prevent_protected_user_role_change();

SELECT 'Super Admin protection triggers created!' as result;
