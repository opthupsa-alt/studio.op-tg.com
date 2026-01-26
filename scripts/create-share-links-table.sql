-- Create share_links table
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  password TEXT, -- NULL means no password required
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ, -- NULL means no expiration
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique constraint: one share link per client/year/month
  UNIQUE(client_id, year, month)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_share_links_client_year_month 
ON share_links(client_id, year, month);

-- Enable RLS
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read active share links (for public access)
CREATE POLICY "Anyone can read active share links"
ON share_links FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Policy: Authenticated users can manage share links
CREATE POLICY "Authenticated users can manage share links"
ON share_links FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
