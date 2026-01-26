import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.POSTGRES_URL || "postgres://postgres.poouovsuyhnnrqtqeybq:Jn0wcmwIOtOenXhk@aws-1-us-east-1.pooler.supabase.com:6543/postgres";

async function runMigration() {
  const client = new pg.Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '006_team_member_clients_simple.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running migration 006_team_member_clients.sql...');
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify table exists
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'team_member_clients'
      );
    `);
    
    console.log('Table team_member_clients exists:', result.rows[0].exists);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

runMigration();
