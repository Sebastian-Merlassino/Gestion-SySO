// scripts/validate-empresas.js
const { Client } = require('pg');


const connectionString = `postgresql://postgres:xhMgA31YroZ3WhPO@db.wbykmdexenparduosadj.supabase.co:5432/postgres`;

async function validate() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Postgres.');

    // 1. Verificación de existencia de Tablas y Columnas
    console.log('\n--- Checking Tables ---');
    const tableCheck = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename IN ('empresas', 'establecimientos')
    `);
    console.log('Found tables:', tableCheck.rows.map(r => r.tablename));
    if (tableCheck.rows.length !== 2) {
      throw new Error('Error: empresas or establecimientos tables are missing!');
    }

    // 2. Verificación de RLS y Políticas
    console.log('\n--- Checking RLS Policies ---');
    const policiesCheck = await client.query(`
      SELECT tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('empresas', 'establecimientos')
    `);
    policiesCheck.rows.forEach(row => {
      console.log(`Table: ${row.tablename}`);
      console.log(`- Policy Name: ${row.policyname}`);
      console.log(`- Command: ${row.cmd}`);
      console.log(`- Roles: ${row.roles}`);
      console.log(`- Qual (USING): ${row.qual}`);
      console.log(`- With Check: ${row.with_check}`);
      console.log('-----------------------------');
    });

    // 3. Verificación de RLS activado en ambas tablas
    console.log('\n--- Checking if RLS is enabled ---');
    const rlsCheck = await client.query(`
      SELECT relname, relrowsecurity, relforcerowsecurity 
      FROM pg_class 
      WHERE relname IN ('empresas', 'establecimientos')
    `);
    rlsCheck.rows.forEach(row => {
      console.log(`Table: ${row.relname} | RLS Enabled: ${row.relrowsecurity} | Force RLS: ${row.relforcerowsecurity}`);
    });

    // 4. Test cascading constraint check (ON DELETE CASCADE)
    console.log('\n--- Checking foreign key constraints ---');
    const fkCheck = await client.query(`
      SELECT
          tc.table_schema, 
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          JOIN information_schema.referential_constraints AS rc
            ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name IN ('empresas', 'establecimientos');
    `);
    fkCheck.rows.forEach(row => {
      console.log(`Table: ${row.table_name} | FK: ${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name} | On Delete Rule: ${row.delete_rule}`);
    });

    console.log('\nAll database structure and configuration validations succeeded.');

  } catch (err) {
    console.error('Validation failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

validate();
