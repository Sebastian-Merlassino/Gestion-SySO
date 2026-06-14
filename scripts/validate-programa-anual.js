// scripts/validate-programa-anual.js
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
  console.log('Querying public.programa_anual_catalogo using ANON key...');
  
  const { data, error, count } = await supabase
    .from('programa_anual_catalogo')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Error fetching programa anual catalog:', error);
    process.exit(1);
  }

  console.log(`Successfully retrieved ${data.length} records (exact count: ${count}).`);
  
  if (data.length === 81) {
    console.log('\n[SUCCESS] Retrieved all 81 catalog activities!');
  } else {
    console.warn(`\n[WARNING] Expected 81 activities, but retrieved ${data.length}.`);
  }

  // Verify a few sample descriptions
  const sampleDescriptions = [
    'Análisis bacteriológico de agua de consumo humano (Semestral)',
    'Confeccionar / actualizar el Plan de Evacuación',
    'Seguro Ambiental Obligatorio'
  ];
  
  console.log('\nVerifying sample activities:');
  sampleDescriptions.forEach(desc => {
    const match = data.find(act => act.descripcion === desc);
    if (match) {
      console.log(`- [OK] Found: "${match.descripcion}" | Legal: "${match.marco_legal}" | Jurisdicción: "${match.jurisdiccion}"`);
    } else {
      console.error(`- [FAIL] Activity: "${desc}" not found in database!`);
    }
  });
}

run();
