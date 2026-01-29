import pg from 'pg'

const client = new pg.Client({
  connectionString: 'postgres://postgres.poouovsuyhnnrqtqeybq:Jn0wcmwIOtOenXhk@aws-1-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
})

async function check() {
  await client.connect()
  
  // Check existing policies
  const { rows } = await client.query(`
    SELECT policyname, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects'
    ORDER BY policyname
  `)
  
  console.log('Current Storage Policies:\n')
  rows.forEach(r => {
    console.log('---')
    console.log('Policy:', r.policyname)
    console.log('Command:', r.cmd)
    if (r.qual) console.log('USING:', r.qual.substring(0, 300))
    if (r.with_check) console.log('WITH CHECK:', r.with_check.substring(0, 300))
  })
  
  await client.end()
}
check()
