// scripts/check-policies.js
const { Client } = require('pg');
require('dotenv').config();

const connectionString = `postgresql://postgres:xhMgA31YroZ3WhPO@db.wbykmdexenparduosadj.supabase.co:5432/postgres`;

async function check() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Postgres.');

    const res = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('tenants', 'profiles')
    `);

    console.log('\n--- Row Level Security Policies ---');
    res.rows.forEach(row => {
      console.log(`Table: ${row.tablename}`);
      console.log(`- Policy Name: ${row.policyname}`);
      console.log(`- Command (cmd): ${row.cmd}`);
      console.log(`- Roles: ${row.roles}`);
      console.log(`- Qual (USING): ${row.qual}`);
      console.log(`- With Check: ${row.with_check}`);
      console.log('-----------------------------');
    });

  } catch (err) {
    console.error('Failed to check policies:', err);
  } finally {
    await client.end();
  }
}

check();
