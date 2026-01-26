// Fix data script - insert platforms with correct IDs and link posts
import pg from 'pg'
const { Client } = pg

const connectionString = 'postgres://postgres.poouovsuyhnnrqtqeybq:Jn0wcmwIOtOenXhk@aws-1-us-east-1.pooler.supabase.com:6543/postgres'

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
})

async function main() {
  console.log('🚀 Connecting to database...\n')
  await client.connect()
  console.log('✅ Connected!\n')

  // Check current platforms
  const { rows: platforms } = await client.query('SELECT id, key, name FROM platforms')
  console.log('Current platforms:', platforms)

  // Get actual platform IDs
  const platformMap = {}
  for (const p of platforms) {
    platformMap[p.key] = p.id
  }

  console.log('\nPlatform map:', platformMap)

  // Check current posts
  const { rows: posts } = await client.query('SELECT id, title FROM posts')
  console.log('\nCurrent posts:', posts.length, 'posts')

  if (posts.length > 0 && Object.keys(platformMap).length > 0) {
    // Insert post_platforms with actual IDs
    console.log('\n📦 Inserting post_platforms...')
    
    const postPlatformPairs = [
      { postTitle: 'إطلاق منتجنا الجديد!', platforms: ['instagram', 'facebook'] },
      { postTitle: 'مميزات المنتج الجديد', platforms: ['instagram'] },
      { postTitle: 'شهادات العملاء', platforms: ['youtube'] },
      { postTitle: 'وصفة اليوم: سلطة صحية', platforms: ['instagram', 'tiktok'] },
      { postTitle: 'نصائح غذائية للشتاء', platforms: ['instagram'] },
      { postTitle: 'تخفيضات حتى 50%', platforms: ['instagram', 'snapchat'] },
      { postTitle: 'موضة 2026', platforms: ['instagram', 'tiktok'] },
    ]

    for (const pair of postPlatformPairs) {
      const post = posts.find(p => p.title === pair.postTitle)
      if (post) {
        for (const platformKey of pair.platforms) {
          const platformId = platformMap[platformKey]
          if (platformId) {
            try {
              await client.query(
                'INSERT INTO post_platforms (post_id, platform_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [post.id, platformId]
              )
              console.log(`  ✅ Linked "${pair.postTitle}" to ${platformKey}`)
            } catch (e) {
              console.log(`  ❌ Error linking "${pair.postTitle}" to ${platformKey}:`, e.message)
            }
          }
        }
      }
    }
  }

  // Check clients
  const { rows: clients } = await client.query('SELECT id, name FROM clients')
  console.log('\nCurrent clients:', clients.length, 'clients')

  if (clients.length > 0 && Object.keys(platformMap).length > 0) {
    console.log('\n📦 Inserting client_platforms...')
    
    const clientPlatformPairs = [
      { clientName: 'حلول التقنية', platforms: ['instagram', 'facebook', 'linkedin'] },
      { clientName: 'الأغذية الخضراء', platforms: ['instagram', 'tiktok'] },
      { clientName: 'بيت الأزياء', platforms: ['instagram', 'tiktok', 'snapchat'] },
    ]

    for (const pair of clientPlatformPairs) {
      const clientObj = clients.find(c => c.name === pair.clientName)
      if (clientObj) {
        for (const platformKey of pair.platforms) {
          const platformId = platformMap[platformKey]
          if (platformId) {
            try {
              await client.query(
                'INSERT INTO client_platforms (client_id, platform_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [clientObj.id, platformId]
              )
              console.log(`  ✅ Linked "${pair.clientName}" to ${platformKey}`)
            } catch (e) {
              console.log(`  ❌ Error linking "${pair.clientName}" to ${platformKey}:`, e.message)
            }
          }
        }
      }
    }
  }

  console.log('\n✅ Done!')
  await client.end()
}

main().catch(console.error)
