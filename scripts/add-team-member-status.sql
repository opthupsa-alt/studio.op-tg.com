-- Add status column to team_members table for enabling/disabling users
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Update existing records to have active status
UPDATE team_members SET status = 'active' WHERE status IS NULL;
