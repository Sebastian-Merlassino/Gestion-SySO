// scripts/inspect-db.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Admin key to bypass RLS

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- Fetching Tenants ---');
  const { data: tenants, error: tError } = await supabase
    .from('tenants')
    .select('*');

  if (tError) {
    console.error('Error fetching tenants:', tError);
  } else {
    console.log(`Found ${tenants.length} tenants:`);
    tenants.forEach(t => {
      console.log(`- ID: ${t.id}, Slug: ${t.slug}, Name: ${t.name}, Plan: ${t.plan_id}, Logo1: ${t.logo_1_url}, Logo2: ${t.logo_2_url}`);
    });
  }

  console.log('\n--- Fetching Profiles ---');
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*');

  if (pError) {
    console.error('Error fetching profiles:', pError);
  } else {
    console.log(`Found ${profiles.length} profiles:`);
    profiles.forEach(p => {
      console.log(`- ID: ${p.id}, TenantID: ${p.tenant_id}, Email: ${p.email}, FullName: ${p.full_name}, CUIT: ${p.cuit}, phone: ${p.phone}`);
    });
  }
}

run();
