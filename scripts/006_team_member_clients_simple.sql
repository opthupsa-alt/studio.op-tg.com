-- =====================================================
-- Team Member Clients - Simple Table Creation
-- =====================================================

-- 1. Create team_member_clients table
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

-- 2. Enable RLS
ALTER TABLE team_member_clients ENABLE ROW LEVEL SECURITY;

-- 3. Simple RLS policy - allow all authenticated users to read
DROP POLICY IF EXISTS "team_member_clients_select_all" ON team_member_clients;
CREATE POLICY "team_member_clients_select_all" ON team_member_clients
  FOR SELECT TO authenticated USING (true);

-- 4. Allow authenticated users to insert/update/delete
DROP POLICY IF EXISTS "team_member_clients_insert_all" ON team_member_clients;
CREATE POLICY "team_member_clients_insert_all" ON team_member_clients
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "team_member_clients_delete_all" ON team_member_clients;
CREATE POLICY "team_member_clients_delete_all" ON team_member_clients
  FOR DELETE TO authenticated USING (true);

SELECT 'team_member_clients table created successfully!' as result;
