// scripts/test-inspector-save.js
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || `https://wbykmdexenparduosadj.supabase.co`;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || `sb_publishable_fb9EJntklN1Ego93gSZqTQ_helFuKzV`;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseSecretKey) {
  console.error('Missing SUPABASE_SECRET_KEY in environment or .env file');
  process.exit(1);
}

async function run() {
  // 1. Force set the inspector's password to a known one using admin client
  console.log('Force setting password for natalia.alvarez@gestiaonsyso.com...');
  const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const userId = '2310f779-01eb-43ed-9109-b96a5e99efa4';
  const testPassword = 'nataliaPassword123!';

  const { data: updateUserData, error: updateUserError } = await adminClient.auth.admin.updateUserById(userId, {
    password: testPassword
  });
  if (updateUserError) {
    console.error('Password set failed:', updateUserError);
    return;
  }
  console.log('Password set successfully!', updateUserData.user.email);

  // 2. Initialize normal Supabase client and sign in as Natalia
  console.log('Signing in as Natalia Alvarez...');
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: authData, error: signInError } = await client.auth.signInWithPassword({
    email: 'natalia.alvarez@gestionsyso.com',
    password: testPassword
  });

  if (signInError) {
    console.error('Sign in failed:', signInError);
    return;
  }

  console.log('Successfully signed in! Access Token is valid.');

  // Set the session on a new client to simulate her request
  const nataliaClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    }
  });

  // 3. Try to update her profile (mimicking profile/page.js save)
  console.log('Attempting to update profiles table...');
  const { data: profUpdate, error: profError } = await nataliaClient
    .from('profiles')
    .update({
      full_name: 'Natalia Alvarez Test',
      phone: '01139289740',
      cuit: '11111111111',
      provincia: 'BUENOS AIRES',
      departamento_partido: 'AVELLANEDA',
      birth_date: '2026-06-15'
    })
    .eq('id', userId)
    .select();

  if (profError) {
    console.error('profiles UPDATE failed:', profError);
  } else {
    console.log('profiles UPDATE succeeded!', profUpdate);
  }

  // 4. Try to delete and insert matriculas (mimicking profile/page.js save)
  console.log('Attempting to delete matriculas...');
  const { error: deleteErr } = await nataliaClient
    .from('matriculas')
    .delete()
    .eq('profile_id', userId);

  if (deleteErr) {
    console.error('matriculas DELETE failed:', deleteErr);
  } else {
    console.log('matriculas DELETE succeeded!');
  }

  console.log('Attempting to insert matriculas...');
  const { data: insertData, error: insertErr } = await nataliaClient
    .from('matriculas')
    .insert([
      {
        profile_id: userId,
        institucion: 'CPSH',
        numero: 'L123456',
        vencimiento: '2028-12-31'
      }
    ])
    .select();

  if (insertErr) {
    console.error('matriculas INSERT failed:', insertErr);
  } else {
    console.log('matriculas INSERT succeeded!', insertData);
  }

}

run();
