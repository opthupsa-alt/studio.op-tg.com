import pg from 'pg'
const { Client } = pg

const connectionString = 'postgres://postgres.poouovsuyhnnrqtqeybq:Jn0wcmwIOtOenXhk@aws-1-us-east-1.pooler.supabase.com:6543/postgres'

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
})

async function main() {
  await client.connect()
  console.log('📊 تحليل قاعدة البيانات\n')

  // Get all tables
  const { rows: tables } = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `)
  console.log('📋 الجداول الموجودة:')
  tables.forEach(t => console.log(`  - ${t.table_name}`))

  // Check posts table columns
  const { rows: postsCols } = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'posts'
    ORDER BY ordinal_position
  `)
  console.log('\n📝 أعمدة جدول posts:')
  postsCols.forEach(c => console.log(`  - ${c.column_name} (${c.data_type}) ${c.is_nullable === 'NO' ? 'NOT NULL' : ''}`))

  // Check if updated_at exists
  const hasUpdatedAt = postsCols.some(c => c.column_name === 'updated_at')
  console.log(`\n⚠️ updated_at موجود: ${hasUpdatedAt ? 'نعم' : 'لا'}`)

  // Check RLS status
  const { rows: rlsStatus } = await client.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
  `)
  console.log('\n🔒 حالة RLS:')
  rlsStatus.forEach(r => console.log(`  - ${r.tablename}: ${r.rowsecurity ? 'مفعل' : 'معطل'}`))

  // Count data
  console.log('\n📈 إحصائيات البيانات:')
  const counts = ['platforms', 'clients', 'team_members', 'plans', 'posts', 'post_platforms', 'comments', 'approvals']
  for (const table of counts) {
    try {
      const { rows } = await client.query(`SELECT COUNT(*) FROM ${table}`)
      console.log(`  - ${table}: ${rows[0].count}`)
    } catch (e) {
      console.log(`  - ${table}: غير موجود`)
    }
  }

  await client.end()
}

main().catch(console.error)
