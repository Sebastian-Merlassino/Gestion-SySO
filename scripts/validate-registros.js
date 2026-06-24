// scripts/validate-registros.js
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env manually to avoid 'dotenv' package dependency issues
let supabaseUrl = '';
let supabaseKey = '';

try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        if (key === 'NEXT_PUBLIC_SUPABASE_URL') {
          supabaseUrl = val;
        } else if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
          supabaseKey = val;
        }
      }
    }
  }
} catch (e) {
  console.error('Error loading .env file manually:', e);
}

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Querying public.registros using ANON key...');
  
  const { data, error, count } = await supabase
    .from('registros')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Error fetching records:', error);
    process.exit(1);
  }

  console.log(`Successfully retrieved ${data.length} records (exact count: ${count}).`);
  
  // Verify a few sample records
  const sampleRecords = [
    'Análisis bacteriológico de agua de consumo humano',
    'Anexo - Resolución 84/12 (Protocolo de Iluminación)',
    'Ficha de seguridad',
    'Sistema de Autoprotección'
  ];
  console.log('\nVerifying sample records:');
  
  sampleRecords.forEach(nombre => {
    const match = data.find(rec => rec.nombre === nombre);
    if (match) {
      console.log(`- [OK] found: "${match.nombre}" (ID: ${match.id})`);
    } else {
      console.error(`- [FAIL] record not found: "${nombre}"`);
    }
  });

  if (data.length === 59) {
    console.log('\nValidation successful! All 59 records are present.');
  } else {
    console.warn(`\nValidation warning: Expected 59 records, found ${data.length}.`);
  }
}

run();
