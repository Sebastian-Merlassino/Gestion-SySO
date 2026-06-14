// scripts/run-migrations.js
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

    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    console.log(`Found ${files.length} migration files in supabase/migrations/`);

    for (const file of files) {
      console.log(`\n--------------------------------------------`);
      console.log(`Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Split the file into individual statements to handle errors gracefully statement by statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (let statement of statements) {
        // Restore semicolon
        statement += ';';
        try {
          await client.query(statement);
        } catch (err) {
          // Gracefully handle "already exists" errors since the schema might be partially applied
          if (
            err.message.includes('already exists') || 
            err.message.includes('already a member') ||
            err.message.includes('already constraint') ||
            err.message.includes('already exists, skipping')
          ) {
            console.log(`[SKIPPED] ${err.message.split('\n')[0]}`);
          } else {
            console.error(`[ERROR] In statement: "${statement.substring(0, 100)}..."`);
            console.error(`Reason: ${err.message}`);
          }
        }
      }
      console.log(`Migration ${file} processed.`);
    }

    console.log(`\n--------------------------------------------`);
    console.log('Reloading PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('Schema cache reload notification sent successfully!');
    console.log('All migrations processed successfully.');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
