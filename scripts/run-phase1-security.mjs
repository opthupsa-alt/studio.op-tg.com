import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = "postgres://postgres.poouovsuyhnnrqtqeybq:Jn0wcmwIOtOenXhk@aws-1-us-east-1.pooler.supabase.com:6543/postgres";

async function runMigration(filename) {
  const client = new pg.Client({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${filename}`);
    console.log('='.repeat(60));
    
    await client.connect();
    
    const sqlPath = path.join(__dirname, filename);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    
    console.log(`✅ ${filename} completed successfully!`);
    return true;
  } catch (error) {
    console.error(`❌ ${filename} failed:`, error.message);
    return false;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🔒 Phase 1 - P0 Security Implementation');
  console.log('========================================\n');
  
  // Step 1: Complete RLS Policies
  const rlsResult = await runMigration('009_complete_rls_policies.sql');
  
  if (!rlsResult) {
    console.log('\n⚠️  RLS policies failed. Stopping.');
    process.exit(1);
  }
  
  // Step 2: Storage Security
  const storageResult = await runMigration('010_storage_security.sql');
  
  if (!storageResult) {
    console.log('\n⚠️  Storage security failed. Stopping.');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Phase 1 Security Complete!');
  console.log('='.repeat(60));
  console.log('\nNext Steps:');
  console.log('1. Test RLS with different user roles');
  console.log('2. Verify storage access controls');
  console.log('3. Implement Share Links protection');
}

main();
