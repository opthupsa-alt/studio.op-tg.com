// Check user and team_members link
import pg from 'pg'
const { Client } = pg

const connectionString = 'postgres://postgres.poouovsuyhnnrqtqeybq:Jn0wcmwIOtOenXhk@aws-1-us-east-1.pooler.supabase.com:6543/postgres'

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
})

async function main() {
  await client.connect()
  
  // Check team_members
  const { rows: members } = await client.query('SELECT id, full_name, email, user_id, role FROM team_members')
  console.log('Team members:')
  members.forEach(m => {
    console.log(`  - ${m.full_name} (${m.email}) - role: ${m.role} - user_id: ${m.user_id || 'NOT LINKED'}`)
  })

  // Update admin user link
  console.log('\n📦 Updating admin user link...')
  await client.query(`
    UPDATE team_members 
    SET user_id = '983fa8ab-27c0-4d34-b154-996cec25c500'
    WHERE email = 'admin@example.com' AND user_id IS NULL
  `)

  // Check again
  const { rows: updated } = await client.query("SELECT * FROM team_members WHERE email = 'admin@example.com'")
  console.log('\nAdmin user:', updated[0])

  await client.end()
}

main().catch(console.error)
