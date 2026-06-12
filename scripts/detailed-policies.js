// scripts/detailed-policies.js
const { Client } = require('pg');
require('dotenv').config();

const connectionString = `postgresql://postgres:xhMgA31YroZ3WhPO@db.wbykmdexenparduosadj.supabase.co:5432/postgres`;

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Postgres.');

    const res = await client.query(`
      SELECT 
        c.relname AS tablename, 
        p.polname AS policyname, 
        p.polcmd AS cmd, 
        p.polroles AS roles, 
        pg_get_expr(p.polqual, p.polrelid) AS using_expr,
        pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expr
      FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      WHERE c.relname IN ('tenants', 'profiles')
    `);

    console.log('\n--- Detailed Row Level Security Policies ---');
    res.rows.forEach(row => {
      console.log(`Table: ${row.tablename}`);
      console.log(`- Policy Name: ${row.policyname}`);
      console.log(`- Command (cmd): ${row.cmd}`);
      console.log(`- Roles: ${row.roles}`);
      console.log(`- USING: ${row.using_expr}`);
      console.log(`- WITH CHECK: ${row.with_check_expr}`);
      console.log('-----------------------------');
    });

  } catch (err) {
    console.error('Failed to query pg_policy:', err);
  } finally {
    await client.end();
  }
}

run();
