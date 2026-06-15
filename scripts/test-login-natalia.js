const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = `https://wbykmdexenparduosadj.supabase.co`;
const supabaseAnonKey = `sb_publishable_fb9EJntklN1Ego93gSZqTQ_helFuKzV`;

async function testLogin(email, password) {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log(`Trying to sign in with: ${email} ...`);
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Login FAILED:', error.message, error.status);
  } else {
    console.log('Login SUCCESSFUL!', data.user.id);
  }
}

async function run() {
  // Try nataliaPassword123!
  await testLogin('natalia.alvarez@gestionsyso.com', 'nataliaPassword123!');
  // Let's also check other possible passwords or see if we can set it to a simple one
}

run();
