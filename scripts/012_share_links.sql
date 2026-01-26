-- =====================================================
-- Share Links - Secure Sharing with Tokens
-- Version: 012
-- Date: 2026-01-26
-- Purpose: Protect share links with random tokens
-- =====================================================

-- =====================================================
-- STEP 1: Create share_links table
-- =====================================================

CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT ARRAY['read'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  access_count INT DEFAULT 0,
  UNIQUE(client_id, year, month)
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_client_id ON share_links(client_id);

-- =====================================================
-- STEP 2: Enable RLS
-- =====================================================

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

-- SELECT: Admin/Manager can see all, others can see their client's links
DROP POLICY IF EXISTS "share_links_select" ON share_links;
CREATE POLICY "share_links_select" ON share_links
  FOR SELECT USING (
    is_admin_or_manager()
    OR client_id IN (SELECT get_user_client_ids())
  );

-- INSERT: Only admin/manager can create share links
DROP POLICY IF EXISTS "share_links_insert" ON share_links;
CREATE POLICY "share_links_insert" ON share_links
  FOR INSERT WITH CHECK (
    is_admin_or_manager()
  );

-- UPDATE: Only admin/manager can update share links
DROP POLICY IF EXISTS "share_links_update" ON share_links;
CREATE POLICY "share_links_update" ON share_links
  FOR UPDATE USING (
    is_admin_or_manager()
  );

-- DELETE: Only admin/manager can delete share links
DROP POLICY IF EXISTS "share_links_delete" ON share_links;
CREATE POLICY "share_links_delete" ON share_links
  FOR DELETE USING (
    is_admin_or_manager()
  );

-- =====================================================
-- STEP 3: Function to generate secure token
-- =====================================================

CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..48 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 4: Function to validate share token
-- =====================================================

CREATE OR REPLACE FUNCTION validate_share_token(
  p_token TEXT,
  p_client_id UUID DEFAULT NULL,
  p_year INT DEFAULT NULL,
  p_month INT DEFAULT NULL
)
RETURNS TABLE(
  is_valid BOOLEAN,
  share_link_id UUID,
  client_id UUID,
  year INT,
  month INT,
  scopes TEXT[]
) AS $$
DECLARE
  link RECORD;
BEGIN
  -- Find the share link
  SELECT sl.* INTO link
  FROM share_links sl
  WHERE sl.token = p_token
    AND sl.is_active = true
    AND (sl.expires_at IS NULL OR sl.expires_at > NOW());
  
  IF link IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::INT, NULL::INT, NULL::TEXT[];
    RETURN;
  END IF;
  
  -- Validate client/year/month if provided
  IF p_client_id IS NOT NULL AND link.client_id != p_client_id THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::INT, NULL::INT, NULL::TEXT[];
    RETURN;
  END IF;
  
  IF p_year IS NOT NULL AND link.year != p_year THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::INT, NULL::INT, NULL::TEXT[];
    RETURN;
  END IF;
  
  IF p_month IS NOT NULL AND link.month != p_month THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::INT, NULL::INT, NULL::TEXT[];
    RETURN;
  END IF;
  
  -- Update access stats (bypass RLS)
  UPDATE share_links 
  SET last_accessed_at = NOW(), access_count = access_count + 1
  WHERE id = link.id;
  
  RETURN QUERY SELECT true, link.id, link.client_id, link.year, link.month, link.scopes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 5: Function to create or get share link
-- =====================================================

CREATE OR REPLACE FUNCTION create_or_get_share_link(
  p_client_id UUID,
  p_year INT,
  p_month INT,
  p_expires_in_days INT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  token TEXT,
  expires_at TIMESTAMPTZ,
  created BOOLEAN
) AS $$
DECLARE
  existing RECORD;
  new_token TEXT;
  new_expires TIMESTAMPTZ;
  new_id UUID;
BEGIN
  -- Check for existing active link
  SELECT sl.id, sl.token, sl.expires_at INTO existing
  FROM share_links sl
  WHERE sl.client_id = p_client_id
    AND sl.year = p_year
    AND sl.month = p_month
    AND sl.is_active = true;
  
  IF existing IS NOT NULL THEN
    RETURN QUERY SELECT existing.id, existing.token, existing.expires_at, false;
    RETURN;
  END IF;
  
  -- Generate new token
  new_token := generate_share_token();
  
  -- Calculate expiration
  IF p_expires_in_days IS NOT NULL THEN
    new_expires := NOW() + (p_expires_in_days || ' days')::INTERVAL;
  ELSE
    new_expires := NULL;
  END IF;
  
  -- Insert new link
  INSERT INTO share_links (client_id, year, month, token, expires_at, created_by)
  VALUES (p_client_id, p_year, p_month, new_token, new_expires, auth.uid())
  RETURNING share_links.id INTO new_id;
  
  RETURN QUERY SELECT new_id, new_token, new_expires, true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DONE!
-- =====================================================

SELECT 'Share Links table and functions created successfully!' as result;
