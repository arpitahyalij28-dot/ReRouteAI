// Logistics Twin - Database Seeding Script
// Run via: `node scripts/seed.js`
// Populates Supabase Postgres tables with initial demo data

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.log('----------------------------------------------------');
    console.log('Logistics Twin Seed Utility');
    console.log('----------------------------------------------------');
    console.log('No Supabase credentials detected in environment.');
    console.log('To seed Supabase cloud:');
    console.log('  1. Create a project at https://supabase.com');
    console.log('  2. Run the SQL in supabase/migrations/20261022000000_create_reroute_schema.sql');
    console.log('  3. Run the SQL in supabase/seed.sql');
    console.log('  Or set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and re-run this script.');
    console.log('Local demo mode works offline with zero configuration.');
    console.log('----------------------------------------------------');
    process.exit(0);
  }

  console.log(`Connecting to Supabase at: ${supabaseUrl}`);
  const client = createClient(supabaseUrl, serviceRoleKey);

  const seedSqlPath = path.resolve(__dirname, '../supabase/seed.sql');
  const sql = fs.readFileSync(seedSqlPath, 'utf8');

  console.log(`Executing seed script (${sql.length} bytes)...`);

  // Try direct RPC if exec_sql exists, else individual inserts
  const { error } = await client.rpc('exec_sql', { sql_query: sql });
  if (error) {
    console.warn('Direct SQL RPC not available; please paste supabase/seed.sql into Supabase SQL Editor.');
  } else {
    console.log('Seed executed successfully!');
  }
}

runSeed().catch((err) => {
  console.error('Seed script encountered error:', err.message);
  process.exit(1);
});
