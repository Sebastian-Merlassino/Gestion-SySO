const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = `https://wbykmdexenparduosadj.supabase.co`;
const supabaseAnonKey = `sb_publishable_fb9EJntklN1Ego93gSZqTQ_helFuKzV`;

async function run() {
  const userId = '2310f779-01eb-43ed-9109-b96a5e99efa4';
  const testPassword = 'nataliaPassword123!';

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

  const nataliaClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    }
  });

  // Try to update miembros_equipo table (should be blocked)
  console.log('Attempting to update miembros_equipo directly...');
  const { data: updateData, error: updateError } = await nataliaClient
    .from('miembros_equipo')
    .update({
      full_name: 'Hack Name'
    })
    .eq('id', '5679da0f-dd26-4e79-8ad2-f3c73169afe5')
    .select();

  if (updateError) {
    console.log('SUCCESS: update was blocked as expected!', updateError.message);
  } else {
    console.error('FAILURE: update succeeded but should have been blocked!', updateData);
  }

  // Try to insert into miembros_equipo table (should be blocked)
  console.log('Attempting to insert into miembros_equipo directly...');
  const { data: insertData, error: insertError } = await nataliaClient
    .from('miembros_equipo')
    .insert([
      {
        tenant_id: 'e3d40f7d-455a-41a1-a65f-8654408c6595',
        full_name: 'Hack Member',
        email: 'hack@gestionsyso.com',
        cuit: '20202020202',
        phone: '123',
        birth_date: '1990-01-01',
        provincia: 'BUENOS AIRES',
        partido: 'AVELLANEDA'
      }
    ])
    .select();

  if (insertError) {
    console.log('SUCCESS: insert was blocked as expected!', insertError.message);
  } else {
    console.error('FAILURE: insert succeeded but should have been blocked!', insertData);
  }
}

run();
