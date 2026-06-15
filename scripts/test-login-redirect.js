const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = `https://wbykmdexenparduosadj.supabase.co`;
const supabaseAnonKey = `sb_publishable_fb9EJntklN1Ego93gSZqTQ_helFuKzV`;

async function testRedirect() {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  console.log('Logging in as Natalia...');
  const { data, error: authError } = await client.auth.signInWithPassword({
    email: 'natalia.alvarez@gestionsyso.com',
    password: 'nataliaPassword123!'
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }

  console.log('Login successful! User ID:', data.user.id);

  // Replicate login page profile query
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('tenant_id, role, tenants(slug)')
    .eq('id', data.user.id)
    .single();

  if (profileError) {
    console.error('Profile query failed:', profileError.message);
    return;
  }

  console.log('Profile loaded successfully!');
  console.log('Role:', profile.role);
  console.log('Tenant ID:', profile.tenant_id);
  console.log('Tenant Slug:', profile.tenants?.slug);

  if (profile.tenant_id && profile.tenants?.slug) {
    console.log(`Redirecting to: /${profile.tenants.slug}/dashboard`);
  } else {
    console.log('Redirecting to Onboarding...');
  }
}

testRedirect();
