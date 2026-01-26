-- =====================================================
-- الهدف الأمثل للتسويق - Content Planning Platform
-- Database Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1) PLATFORMS - المنصات الاجتماعية
-- =====================================================
CREATE TABLE IF NOT EXISTS platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default platforms
INSERT INTO platforms (key, name, icon) VALUES
  ('instagram', 'Instagram', 'instagram'),
  ('tiktok', 'TikTok', 'tiktok'),
  ('snapchat', 'Snapchat', 'snapchat'),
  ('x', 'X (Twitter)', 'twitter'),
  ('linkedin', 'LinkedIn', 'linkedin')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 2) CLIENTS - العملاء
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  brand_primary_color TEXT DEFAULT '#0ea5e9',
  timezone TEXT DEFAULT 'Asia/Riyadh',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3) TEAM_MEMBERS - أعضاء الفريق
-- =====================================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'writer', 'designer', 'client')),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =====================================================
-- 4) CLIENT_PLATFORMS - المنصات المفعلة لكل عميل
-- =====================================================
CREATE TABLE IF NOT EXISTS client_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, platform_id)
);

-- =====================================================
-- 5) PLANS - الخطط الشهرية
-- =====================================================
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month >= 1 AND month <= 12),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, year, month)
);

-- =====================================================
-- 6) POSTS - البوستات
-- =====================================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  publish_date DATE NOT NULL,
  title TEXT NOT NULL,
  main_goal TEXT CHECK (main_goal IN ('awareness', 'engagement', 'leads', 'messages', 'sales')),
  status TEXT DEFAULT 'idea' CHECK (status IN ('idea', 'draft', 'design', 'internal_review', 'client_review', 'approved', 'scheduled', 'posted')),
  assigned_writer UUID REFERENCES team_members(id) ON DELETE SET NULL,
  assigned_designer UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked BOOLEAN DEFAULT false,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7) POST_PLATFORMS - منصات البوست
-- =====================================================
CREATE TABLE IF NOT EXISTS post_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, platform_id)
);

-- =====================================================
-- 8) POST_VARIANTS - نسخ البوست لكل منصة
-- =====================================================
CREATE TABLE IF NOT EXISTS post_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  caption TEXT,
  hashtags TEXT,
  cta TEXT,
  design_notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'approved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, platform_id)
);

-- =====================================================
-- 9) ASSETS - الملفات والتصاميم
-- =====================================================
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES post_variants(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'link', 'file')),
  url TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10) COMMENTS - التعليقات
-- =====================================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scope TEXT DEFAULT 'internal' CHECK (scope IN ('internal', 'client')),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 11) APPROVALS - سجل الاعتمادات
-- =====================================================
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'pending')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_posts_plan_id ON posts(plan_id);
CREATE INDEX IF NOT EXISTS idx_posts_client_id ON posts(client_id);
CREATE INDEX IF NOT EXISTS idx_posts_publish_date ON posts(publish_date);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_post_platforms_post_id ON post_platforms(post_id);
CREATE INDEX IF NOT EXISTS idx_post_variants_post_id ON post_variants(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_approvals_post_id ON approvals(post_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_client_id ON team_members(client_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;

-- Platforms - Everyone can read
CREATE POLICY "platforms_select_all" ON platforms FOR SELECT USING (true);

-- Clients policies
CREATE POLICY "clients_select" ON clients FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND (team_members.role IN ('admin', 'manager') OR team_members.client_id = clients.id)
  )
);

CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager')
  )
);

CREATE POLICY "clients_update" ON clients FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager')
  )
);

CREATE POLICY "clients_delete" ON clients FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role = 'admin'
  )
);

-- Team members policies
CREATE POLICY "team_members_select" ON team_members FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid() 
    AND tm.role IN ('admin', 'manager')
  )
);

CREATE POLICY "team_members_insert" ON team_members FOR INSERT WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid() 
    AND tm.role IN ('admin', 'manager')
  )
);

CREATE POLICY "team_members_update" ON team_members FOR UPDATE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid() 
    AND tm.role IN ('admin', 'manager')
  )
);

CREATE POLICY "team_members_delete" ON team_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid() 
    AND tm.role = 'admin'
  )
);

-- Client platforms policies
CREATE POLICY "client_platforms_select" ON client_platforms FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND (team_members.role IN ('admin', 'manager') OR team_members.client_id = client_platforms.client_id)
  )
);

CREATE POLICY "client_platforms_insert" ON client_platforms FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager')
  )
);

CREATE POLICY "client_platforms_update" ON client_platforms FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager')
  )
);

CREATE POLICY "client_platforms_delete" ON client_platforms FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager')
  )
);

-- Plans policies
CREATE POLICY "plans_select" ON plans FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND (team_members.role IN ('admin', 'manager', 'writer', 'designer') OR team_members.client_id = plans.client_id)
  )
);

CREATE POLICY "plans_insert" ON plans FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager')
  )
);

CREATE POLICY "plans_update" ON plans FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager')
  )
);

CREATE POLICY "plans_delete" ON plans FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role = 'admin'
  )
);

-- Posts policies
CREATE POLICY "posts_select" ON posts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND (team_members.role IN ('admin', 'manager', 'writer', 'designer') OR team_members.client_id = posts.client_id)
  )
);

CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager', 'writer')
  )
);

CREATE POLICY "posts_update" ON posts FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid() 
    AND (
      tm.role IN ('admin', 'manager') OR
      (tm.role IN ('writer', 'designer') AND NOT posts.locked)
    )
  )
);

CREATE POLICY "posts_delete" ON posts FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager')
  )
);

-- Post platforms policies
CREATE POLICY "post_platforms_select" ON post_platforms FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts 
    JOIN team_members ON team_members.user_id = auth.uid()
    WHERE posts.id = post_platforms.post_id
    AND (team_members.role IN ('admin', 'manager', 'writer', 'designer') OR team_members.client_id = posts.client_id)
  )
);

CREATE POLICY "post_platforms_insert" ON post_platforms FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager', 'writer')
  )
);

CREATE POLICY "post_platforms_update" ON post_platforms FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager', 'writer')
  )
);

CREATE POLICY "post_platforms_delete" ON post_platforms FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager', 'writer')
  )
);

-- Post variants policies
CREATE POLICY "post_variants_select" ON post_variants FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts 
    JOIN team_members ON team_members.user_id = auth.uid()
    WHERE posts.id = post_variants.post_id
    AND (team_members.role IN ('admin', 'manager', 'writer', 'designer') OR team_members.client_id = posts.client_id)
  )
);

CREATE POLICY "post_variants_insert" ON post_variants FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager', 'writer')
  )
);

CREATE POLICY "post_variants_update" ON post_variants FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager', 'writer', 'designer')
  )
);

CREATE POLICY "post_variants_delete" ON post_variants FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager', 'writer')
  )
);

-- Assets policies
CREATE POLICY "assets_select" ON assets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts 
    JOIN team_members ON team_members.user_id = auth.uid()
    WHERE posts.id = assets.post_id
    AND (team_members.role IN ('admin', 'manager', 'writer', 'designer') OR team_members.client_id = posts.client_id)
  )
);

CREATE POLICY "assets_insert" ON assets FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager', 'writer', 'designer')
  )
);

CREATE POLICY "assets_update" ON assets FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager', 'writer', 'designer')
  )
);

CREATE POLICY "assets_delete" ON assets FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager', 'writer', 'designer')
  )
);

-- Comments policies
CREATE POLICY "comments_select" ON comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts 
    JOIN team_members ON team_members.user_id = auth.uid()
    WHERE posts.id = comments.post_id
    AND (
      team_members.role IN ('admin', 'manager', 'writer', 'designer') OR
      (team_members.client_id = posts.client_id AND comments.scope = 'client')
    )
  )
);

CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid()
  )
);

CREATE POLICY "comments_update" ON comments FOR UPDATE USING (
  user_id = auth.uid()
);

CREATE POLICY "comments_delete" ON comments FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager')
  )
);

-- Approvals policies
CREATE POLICY "approvals_select" ON approvals FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM posts 
    JOIN team_members ON team_members.user_id = auth.uid()
    WHERE posts.id = approvals.post_id
    AND (team_members.role IN ('admin', 'manager', 'writer', 'designer') OR team_members.client_id = posts.client_id)
  )
);

CREATE POLICY "approvals_insert" ON approvals FOR INSERT WITH CHECK (
  client_user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid()
  )
);

CREATE POLICY "approvals_update" ON approvals FOR UPDATE USING (
  client_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager')
  )
);

CREATE POLICY "approvals_delete" ON approvals FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_members.user_id = auth.uid() 
    AND team_members.role IN ('admin', 'manager')
  )
);

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_post_variants_updated_at ON post_variants;
CREATE TRIGGER update_post_variants_updated_at
  BEFORE UPDATE ON post_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
