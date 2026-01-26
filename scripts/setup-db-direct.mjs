// Direct PostgreSQL Database Setup
// Uses pg package to connect directly to Supabase Postgres

import pg from 'pg'
const { Client } = pg

const connectionString = 'postgres://postgres.poouovsuyhnnrqtqeybq:Jn0wcmwIOtOenXhk@aws-1-us-east-1.pooler.supabase.com:6543/postgres'

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
})

async function runSQL(sql, description) {
  console.log(`\n📦 ${description}...`)
  try {
    await client.query(sql)
    console.log(`✅ ${description} - Done!`)
    return true
  } catch (error) {
    console.log(`❌ ${description} - Error:`, error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Connecting to database...\n')
  
  try {
    await client.connect()
    console.log('✅ Connected to database!\n')
  } catch (error) {
    console.log('❌ Connection failed:', error.message)
    process.exit(1)
  }

  // =====================================================
  // 1. Create platforms table
  // =====================================================
  await runSQL(`
    CREATE TABLE IF NOT EXISTS platforms (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key text UNIQUE NOT NULL,
      name text NOT NULL,
      icon text,
      created_at timestamptz DEFAULT now()
    );
  `, 'Creating platforms table')

  // =====================================================
  // 2. Create clients table
  // =====================================================
  await runSQL(`
    CREATE TABLE IF NOT EXISTS clients (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      status text DEFAULT 'active',
      timezone text DEFAULT 'Asia/Riyadh',
      brand_primary_color text,
      created_at timestamptz DEFAULT now()
    );
  `, 'Creating clients table')

  // =====================================================
  // 3. Create team_members table
  // =====================================================
  await runSQL(`
    CREATE TABLE IF NOT EXISTS team_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid UNIQUE,
      full_name text NOT NULL,
      email text,
      role text DEFAULT 'writer' CHECK (role IN ('admin', 'manager', 'writer', 'designer', 'client')),
      client_id uuid REFERENCES clients(id),
      avatar_url text,
      created_at timestamptz DEFAULT now()
    );
  `, 'Creating team_members table')

  // =====================================================
  // 4. Create client_platforms table
  // =====================================================
  await runSQL(`
    CREATE TABLE IF NOT EXISTS client_platforms (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      platform_id uuid NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      UNIQUE(client_id, platform_id)
    );
  `, 'Creating client_platforms table')

  // =====================================================
  // 5. Create plans table
  // =====================================================
  await runSQL(`
    CREATE TABLE IF NOT EXISTS plans (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      year int NOT NULL,
      month int NOT NULL CHECK (month BETWEEN 1 AND 12),
      status text DEFAULT 'active',
      created_at timestamptz DEFAULT now(),
      UNIQUE(client_id, year, month)
    );
  `, 'Creating plans table')

  // =====================================================
  // 6. Create posts table
  // =====================================================
  await runSQL(`
    CREATE TABLE IF NOT EXISTS posts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      publish_date date NOT NULL,
      title text NOT NULL,
      description text,
      post_type text DEFAULT 'post' CHECK (post_type IN ('post', 'reel', 'video', 'story', 'carousel')),
      main_goal text DEFAULT 'awareness' CHECK (main_goal IN ('awareness', 'engagement', 'leads', 'messages', 'sales')),
      status text DEFAULT 'idea' CHECK (status IN ('idea', 'draft', 'design', 'internal_review', 'client_review', 'approved', 'rejected', 'scheduled', 'posted')),
      assigned_writer uuid REFERENCES team_members(id),
      assigned_designer uuid REFERENCES team_members(id),
      created_by uuid REFERENCES team_members(id),
      locked boolean DEFAULT false,
      position int DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  `, 'Creating posts table')

  // =====================================================
  // 7. Create post_platforms table
  // =====================================================
  await runSQL(`
    CREATE TABLE IF NOT EXISTS post_platforms (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      platform_id uuid NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      UNIQUE(post_id, platform_id)
    );
  `, 'Creating post_platforms table')

  // =====================================================
  // 8. Create post_variants table
  // =====================================================
  await runSQL(`
    CREATE TABLE IF NOT EXISTS post_variants (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      platform_id uuid NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
      caption text,
      hashtags text,
      cta text,
      design_notes text,
      status text DEFAULT 'draft',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE(post_id, platform_id)
    );
  `, 'Creating post_variants table')

  // =====================================================
  // 9. Create assets table
  // =====================================================
  await runSQL(`
    CREATE TABLE IF NOT EXISTS assets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      variant_id uuid REFERENCES post_variants(id) ON DELETE CASCADE,
      type text CHECK (type IN ('image', 'video', 'file', 'link')),
      url text NOT NULL,
      name text,
      created_at timestamptz DEFAULT now()
    );
  `, 'Creating assets table')

  // =====================================================
  // 10. Create comments table
  // =====================================================
  await runSQL(`
    CREATE TABLE IF NOT EXISTS comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id uuid,
      scope text DEFAULT 'internal' CHECK (scope IN ('internal', 'client')),
      comment text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  `, 'Creating comments table')

  // =====================================================
  // 11. Create approvals table
  // =====================================================
  await runSQL(`
    CREATE TABLE IF NOT EXISTS approvals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE UNIQUE,
      client_user_id uuid,
      status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      note text,
      created_at timestamptz DEFAULT now()
    );
  `, 'Creating approvals table')

  // =====================================================
  // 12. Add missing columns to posts table
  // =====================================================
  await runSQL(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS description text;`, 'Adding description column')
  await runSQL(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type text DEFAULT 'post';`, 'Adding post_type column')
  await runSQL(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS locked boolean DEFAULT false;`, 'Adding locked column')

  // =====================================================
  // 13. Create indexes
  // =====================================================
  await runSQL(`
    CREATE INDEX IF NOT EXISTS idx_posts_client_id ON posts(client_id);
    CREATE INDEX IF NOT EXISTS idx_posts_plan_id ON posts(plan_id);
    CREATE INDEX IF NOT EXISTS idx_posts_publish_date ON posts(publish_date);
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
  `, 'Creating indexes')

  // =====================================================
  // 13. Disable RLS for now (development)
  // =====================================================
  await runSQL(`
    ALTER TABLE platforms DISABLE ROW LEVEL SECURITY;
    ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
    ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
    ALTER TABLE plans DISABLE ROW LEVEL SECURITY;
    ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
    ALTER TABLE post_platforms DISABLE ROW LEVEL SECURITY;
    ALTER TABLE post_variants DISABLE ROW LEVEL SECURITY;
    ALTER TABLE assets DISABLE ROW LEVEL SECURITY;
    ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
    ALTER TABLE approvals DISABLE ROW LEVEL SECURITY;
    ALTER TABLE client_platforms DISABLE ROW LEVEL SECURITY;
  `, 'Disabling RLS for development')

  // =====================================================
  // SEED DATA
  // =====================================================
  console.log('\n' + '='.repeat(50))
  console.log('📊 Inserting seed data...')
  console.log('='.repeat(50))

  // Platforms
  await runSQL(`
    INSERT INTO platforms (id, key, name, icon) VALUES
      ('11111111-1111-1111-1111-111111111111', 'instagram', 'Instagram', 'instagram'),
      ('22222222-2222-2222-2222-222222222222', 'facebook', 'Facebook', 'facebook'),
      ('33333333-3333-3333-3333-333333333333', 'x', 'X (Twitter)', 'twitter'),
      ('44444444-4444-4444-4444-444444444444', 'tiktok', 'TikTok', 'tiktok'),
      ('55555555-5555-5555-5555-555555555555', 'linkedin', 'LinkedIn', 'linkedin'),
      ('66666666-6666-6666-6666-666666666666', 'snapchat', 'Snapchat', 'snapchat'),
      ('77777777-7777-7777-7777-777777777777', 'youtube', 'YouTube', 'youtube')
    ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;
  `, 'Inserting platforms')

  // Clients
  await runSQL(`
    INSERT INTO clients (id, name, status, brand_primary_color, timezone) VALUES
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'حلول التقنية', 'active', '#3B82F6', 'Asia/Riyadh'),
      ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'الأغذية الخضراء', 'active', '#22C55E', 'Asia/Riyadh'),
      ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'بيت الأزياء', 'active', '#EC4899', 'Asia/Riyadh'),
      ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'أوتو موتورز', 'active', '#F59E0B', 'Asia/Riyadh'),
      ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'صحة بلس', 'active', '#06B6D4', 'Asia/Riyadh')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, brand_primary_color = EXCLUDED.brand_primary_color;
  `, 'Inserting clients')

  // Team members
  await runSQL(`
    INSERT INTO team_members (id, full_name, email, role) VALUES
      ('11111111-aaaa-aaaa-aaaa-111111111111', 'أحمد محمد', 'admin@example.com', 'admin'),
      ('22222222-aaaa-aaaa-aaaa-222222222222', 'سارة أحمد', 'sara@example.com', 'manager'),
      ('33333333-aaaa-aaaa-aaaa-333333333333', 'محمد علي', 'mohamed@example.com', 'writer'),
      ('44444444-aaaa-aaaa-aaaa-444444444444', 'فاطمة حسن', 'fatima@example.com', 'designer')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email;
  `, 'Inserting team members')

  // Plans
  await runSQL(`
    INSERT INTO plans (id, client_id, year, month, status) VALUES
      ('11111111-bbbb-bbbb-bbbb-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 2026, 1, 'active'),
      ('22222222-bbbb-bbbb-bbbb-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2026, 1, 'active'),
      ('33333333-bbbb-bbbb-bbbb-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 2026, 1, 'active')
    ON CONFLICT (client_id, year, month) DO UPDATE SET status = EXCLUDED.status;
  `, 'Inserting plans')

  // Posts
  await runSQL(`
    INSERT INTO posts (id, plan_id, client_id, publish_date, title, description, post_type, main_goal, status, position) VALUES
      ('11111111-cccc-cccc-cccc-111111111111', '11111111-bbbb-bbbb-bbbb-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-01-27', 'إطلاق منتجنا الجديد!', 'نحن متحمسون للإعلان عن إطلاق منتجنا التقني الجديد', 'post', 'awareness', 'scheduled', 1),
      ('22222222-cccc-cccc-cccc-222222222222', '11111111-bbbb-bbbb-bbbb-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-01-28', 'مميزات المنتج الجديد', 'تعرف على أهم 5 مميزات تجعل منتجنا الخيار الأفضل', 'carousel', 'engagement', 'approved', 2),
      ('33333333-cccc-cccc-cccc-333333333333', '11111111-bbbb-bbbb-bbbb-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-01-29', 'شهادات العملاء', 'استمع لتجارب عملائنا الحقيقية مع المنتج', 'video', 'leads', 'client_review', 3),
      ('44444444-cccc-cccc-cccc-444444444444', '22222222-bbbb-bbbb-bbbb-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-01-25', 'وصفة اليوم: سلطة صحية', 'وصفة سهلة وسريعة لسلطة صحية ولذيذة', 'reel', 'engagement', 'posted', 1),
      ('55555555-cccc-cccc-cccc-555555555555', '22222222-bbbb-bbbb-bbbb-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-01-28', 'نصائح غذائية للشتاء', 'أهم النصائح للحفاظ على صحتك في فصل الشتاء', 'carousel', 'awareness', 'scheduled', 2),
      ('66666666-cccc-cccc-cccc-666666666666', '33333333-bbbb-bbbb-bbbb-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-01-26', 'تخفيضات حتى 50%', 'لا تفوتوا الفرصة! تخفيضات كبرى على جميع المنتجات', 'story', 'sales', 'scheduled', 1),
      ('77777777-cccc-cccc-cccc-777777777777', '33333333-bbbb-bbbb-bbbb-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-01-27', 'موضة 2026', 'اكتشف أحدث صيحات الموضة لعام 2026', 'reel', 'awareness', 'approved', 2),
      ('88888888-cccc-cccc-cccc-888888888888', '11111111-bbbb-bbbb-bbbb-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-01-30', 'خلف الكواليس', 'شاهد كيف نصنع منتجاتنا بأعلى معايير الجودة', 'video', 'engagement', 'design', 4),
      ('99999999-cccc-cccc-cccc-999999999999', '22222222-bbbb-bbbb-bbbb-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-01-30', 'سؤال وجواب', 'أجوبة على أكثر الأسئلة شيوعاً من متابعينا', 'story', 'engagement', 'idea', 3),
      ('aaaaaaaa-cccc-cccc-cccc-aaaaaaaaaaaa', '33333333-bbbb-bbbb-bbbb-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-01-28', 'تنسيقات الشتاء', 'أفكار تنسيقات شتوية أنيقة ومريحة', 'carousel', 'engagement', 'draft', 3)
    ON CONFLICT (id) DO UPDATE SET 
      title = EXCLUDED.title, 
      description = EXCLUDED.description, 
      post_type = EXCLUDED.post_type,
      status = EXCLUDED.status;
  `, 'Inserting posts')

  // Post platforms
  await runSQL(`
    INSERT INTO post_platforms (post_id, platform_id) VALUES
      ('11111111-cccc-cccc-cccc-111111111111', '11111111-1111-1111-1111-111111111111'),
      ('11111111-cccc-cccc-cccc-111111111111', '22222222-2222-2222-2222-222222222222'),
      ('22222222-cccc-cccc-cccc-222222222222', '11111111-1111-1111-1111-111111111111'),
      ('33333333-cccc-cccc-cccc-333333333333', '77777777-7777-7777-7777-777777777777'),
      ('44444444-cccc-cccc-cccc-444444444444', '11111111-1111-1111-1111-111111111111'),
      ('44444444-cccc-cccc-cccc-444444444444', '44444444-4444-4444-4444-444444444444'),
      ('55555555-cccc-cccc-cccc-555555555555', '11111111-1111-1111-1111-111111111111'),
      ('66666666-cccc-cccc-cccc-666666666666', '11111111-1111-1111-1111-111111111111'),
      ('66666666-cccc-cccc-cccc-666666666666', '66666666-6666-6666-6666-666666666666'),
      ('77777777-cccc-cccc-cccc-777777777777', '11111111-1111-1111-1111-111111111111'),
      ('77777777-cccc-cccc-cccc-777777777777', '44444444-4444-4444-4444-444444444444')
    ON CONFLICT (post_id, platform_id) DO NOTHING;
  `, 'Inserting post platforms')

  // Client platforms
  await runSQL(`
    INSERT INTO client_platforms (client_id, platform_id) VALUES
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222'),
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555'),
      ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111'),
      ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444'),
      ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111'),
      ('cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444'),
      ('cccccccc-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666666')
    ON CONFLICT (client_id, platform_id) DO NOTHING;
  `, 'Inserting client platforms')

  console.log('\n' + '='.repeat(50))
  console.log('🎉 Database setup complete!')
  console.log('='.repeat(50))

  await client.end()
}

main().catch(async (error) => {
  console.error('Fatal error:', error)
  await client.end()
  process.exit(1)
})
