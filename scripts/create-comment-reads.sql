-- Create comment_reads table to track which comments have been read by which users
CREATE TABLE IF NOT EXISTS comment_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE comment_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: Users can see their own read records
CREATE POLICY "comment_reads_select" ON comment_reads
  FOR SELECT USING (user_id = auth.uid());

-- INSERT: Users can mark comments as read
CREATE POLICY "comment_reads_insert" ON comment_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own read records (optional)
CREATE POLICY "comment_reads_delete" ON comment_reads
  FOR DELETE USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_comment_reads_user_id ON comment_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reads_comment_id ON comment_reads(comment_id);
