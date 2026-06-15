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

  console.log('Successfully signed in!');

  const nataliaClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    }
  });

  // Try the exact update profiles statement
  console.log('Attempting exact update profiles statement...');
  const { data: profUpdate, error: profError } = await nataliaClient
    .from('profiles')
    .update({
      full_name: 'Natalia Alvarez Exact Test',
      phone: '01139289740',
      cuit: '11111111111',
      provincia: 'BUENOS AIRES',
      departamento_partido: 'AVELLANEDA',
      localidad: 'AVELLANEDA',
      birth_date: '2026-06-15',
      signature_url: 'https://wbykmdexenparduosadj.supabase.co/storage/v1/object/sign/signatures/2310f779-01eb-43ed-9109-b96a5e99efa4/firma_test.png',
      matricula_institucion: 'COPIME',
      matricula_numero: 'L999999',
      matricula_vencimiento: '2028-12-31',
      matricula_foto_frente_url: 'https://wbykmdexenparduosadj.supabase.co/storage/v1/object/sign/documents/2310f779-01eb-43ed-9109-b96a5e99efa4/frente_test.png',
      matricula_foto_dorso_url: 'https://wbykmdexenparduosadj.supabase.co/storage/v1/object/sign/documents/2310f779-01eb-43ed-9109-b96a5e99efa4/dorso_test.png'
    })
    .eq('id', userId)
    .select();

  if (profError) {
    console.error('profiles UPDATE failed:', profError);
  } else {
    console.log('profiles UPDATE succeeded!', profUpdate);
  }
}

run();
