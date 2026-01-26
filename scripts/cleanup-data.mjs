// Cleanup duplicate data
import pg from 'pg'
const { Client } = pg

const connectionString = 'postgres://postgres.poouovsuyhnnrqtqeybq:Jn0wcmwIOtOenXhk@aws-1-us-east-1.pooler.supabase.com:6543/postgres'

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
})

async function main() {
  await client.connect()
  console.log('🧹 Cleaning up duplicate data...\n')

  // Delete duplicate team_members (keep ones with user_id linked)
  await client.query(`
    DELETE FROM team_members a
    USING team_members b
    WHERE a.id > b.id 
    AND a.email = b.email
  `)
  console.log('✅ Removed duplicate team_members')

  // Delete duplicate clients
  await client.query(`
    DELETE FROM clients a
    USING clients b
    WHERE a.id > b.id 
    AND a.name = b.name
  `)
  console.log('✅ Removed duplicate clients')

  // Delete duplicate plans
  await client.query(`
    DELETE FROM plans a
    USING plans b
    WHERE a.id > b.id 
    AND a.client_id = b.client_id
    AND a.year = b.year
    AND a.month = b.month
  `)
  console.log('✅ Removed duplicate plans')

  // Check remaining data
  const { rows: members } = await client.query('SELECT id, full_name, email, user_id, role FROM team_members')
  console.log('\nTeam members after cleanup:')
  members.forEach(m => {
    console.log(`  - ${m.full_name} (${m.email}) - ${m.role} - user_id: ${m.user_id || 'NOT LINKED'}`)
  })

  const { rows: clients } = await client.query('SELECT id, name FROM clients')
  console.log(`\nClients: ${clients.length}`)

  const { rows: plans } = await client.query('SELECT id, client_id, year, month FROM plans')
  console.log(`Plans: ${plans.length}`)

  const { rows: posts } = await client.query('SELECT id, title FROM posts')
  console.log(`Posts: ${posts.length}`)

  await client.end()
  console.log('\n✅ Cleanup complete!')
}

main().catch(console.error)
