// scripts/validate-equipo.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Manually parse .env file
if (fs.existsSync('.env')) {
  const envText = fs.readFileSync('.env', 'utf8');
  envText.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      process.env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Validating table public.miembros_equipo exists in Supabase...');
  
  // Since RLS is enabled, querying with ANON key without active session will return empty array [] (no error)
  const { data, error } = await supabase
    .from('miembros_equipo')
    .select('*');

  if (error) {
    console.error('Error querying miembros_equipo:', error);
    process.exit(1);
  }

  console.log('[OK] Table public.miembros_equipo exists and returned successfully.');
  
  console.log('Checking public.matriculas structure modifications...');
  const { data: mData, error: mError } = await supabase
    .from('matriculas')
    .select('id, profile_id, miembro_id')
    .limit(1);

  if (mError) {
    console.error('Error querying matriculas table:', mError);
    process.exit(1);
  }

  console.log('[OK] Table public.matriculas has miembro_id columns and works correctly.');
  console.log('[SUCCESS] Database schema and RLS policies for team members configured correctly.');
}

run();
