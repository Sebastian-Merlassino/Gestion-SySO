const { Client } = require('pg');

const connectionString = `postgresql://postgres:xhMgA31YroZ3WhPO@db.wbykmdexenparduosadj.supabase.co:5432/postgres`;

async function run() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Successfully connected!');

    // Get all users from auth.users
    console.log('\n--- auth.users ---');
    const authRes = await client.query('SELECT id, email, raw_user_meta_data, email_confirmed_at, last_sign_in_at FROM auth.users ORDER BY email');
    console.table(authRes.rows);

    // Get all profiles from public.profiles
    console.log('\n--- public.profiles ---');
    const profilesRes = await client.query('SELECT id, tenant_id, email, role, full_name FROM public.profiles ORDER BY email');
    console.table(profilesRes.rows);

    // Get all members from public.miembros_equipo
    console.log('\n--- public.miembros_equipo ---');
    const membersRes = await client.query('SELECT id, tenant_id, email, full_name, tiene_acceso, profile_id FROM public.miembros_equipo ORDER BY email');
    console.table(membersRes.rows);

  } catch (err) {
    console.error('Failed to query database:', err);
  } finally {
    await client.end();
  }
}

run();
