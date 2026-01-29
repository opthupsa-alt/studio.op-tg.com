import pg from 'pg'

const client = new pg.Client({
  connectionString: 'postgres://postgres.poouovsuyhnnrqtqeybq:Jn0wcmwIOtOenXhk@aws-1-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
})

async function check() {
  await client.connect()
  
  // Check assets table policies
  const { rows } = await client.query(`
    SELECT policyname, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'assets'
    ORDER BY policyname
  `)
  
  console.log('Assets Table RLS Policies:')
  if (rows.length === 0) {
    console.log('NO POLICIES FOUND!')
  } else {
    rows.forEach(r => {
      console.log('---')
      console.log('Policy:', r.policyname)
      console.log('Command:', r.cmd)
      if (r.qual) console.log('USING:', r.qual.substring(0, 200))
      if (r.with_check) console.log('WITH CHECK:', r.with_check.substring(0, 200))
    })
  }
  
  // Check if RLS is enabled
  const { rows: rlsRows } = await client.query(`
    SELECT relrowsecurity FROM pg_class WHERE relname = 'assets'
  `)
  console.log('\nRLS Enabled:', rlsRows[0]?.relrowsecurity)
  
  await client.end()
}
check()
