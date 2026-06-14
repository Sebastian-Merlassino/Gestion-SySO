// scripts/validate-actividades.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Using anon key to verify RLS SELECT policy works

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying public.actividades_economicas using ANON key...');
  
  const { data, error, count } = await supabase
    .from('actividades_economicas')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Error fetching activities:', error);
    process.exit(1);
  }

  console.log(`Successfully retrieved ${data.length} activities (exact count: ${count}).`);
  
  // Verify a few sample codes
  const sampleCodes = ['11111', '101011', '492290', '524120'];
  console.log('\nVerifying sample activities:');
  
  sampleCodes.forEach(code => {
    const match = data.find(act => act.codigo === code);
    if (match) {
      console.log(`- [OK] Code: ${match.codigo} -> ${match.descripcion}`);
    } else {
      console.error(`- [FAIL] Code: ${code} not found in database!`);
    }
  });
}

run();
