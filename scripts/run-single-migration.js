// scripts/run-single-migration.js
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = `postgresql://postgres:xhMgA31YroZ3WhPO@db.wbykmdexenparduosadj.supabase.co:5432/postgres`;

async function run() {
  console.log('Connecting to Supabase PostgreSQL database...');
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Successfully connected!');

    const filePath = path.join(__dirname, '../supabase/migrations/20260619000000_create_programa_anual_catalogo.sql');
    console.log(`Reading migration file: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log('Running SQL query block...');
    await client.query(sql);
    console.log('SQL query block executed successfully!');

    console.log('Reloading PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('PostgREST schema cache reload notification sent!');
    console.log('Migration completed successfully.');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
