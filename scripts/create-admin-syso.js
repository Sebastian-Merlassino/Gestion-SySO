// scripts/create-admin-syso.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Admin key

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = 'admin@gestionsyso.com';
  const password = 'adminPassword123';
  const slug = 'admin-syso';

  console.log(`Checking if user ${email} already exists in Auth...`);
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list users:', listError);
    return;
  }

  // 1. Clean up existing user if any
  const existingUser = users.users.find(u => u.email === email);
  if (existingUser) {
    console.log('User already exists, deleting auth user, tenant, and profile to start clean...');
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('id', existingUser.id).single();
    if (p && p.tenant_id) {
      await supabase.from('profiles').update({ tenant_id: null }).eq('id', existingUser.id);
      await supabase.from('tenants').delete().eq('id', p.tenant_id);
    }
    await supabase.from('profiles').delete().eq('id', existingUser.id);
    await supabase.auth.admin.deleteUser(existingUser.id);
    console.log('Existing user cleaned.');
  }

  const oldUser = users.users.find(u => u.email === 'admin-syso@gestion-syso.com');
  if (oldUser) {
    console.log('Old admin-syso user exists, cleaning up...');
    const { data: p } = await supabase.from('profiles').select('tenant_id').eq('id', oldUser.id).single();
    if (p && p.tenant_id) {
      await supabase.from('profiles').update({ tenant_id: null }).eq('id', oldUser.id);
      await supabase.from('tenants').delete().eq('id', p.tenant_id);
    }
    await supabase.from('profiles').delete().eq('id', oldUser.id);
    await supabase.auth.admin.deleteUser(oldUser.id);
    console.log('Old admin-syso user cleaned.');
  }

  // 2. Create the Tenant with 'libre' plan (unlimited)
  console.log('Creating Admin Tenant with "libre" plan...');
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .insert({
      name: 'Administración Global SySO',
      slug: slug,
      status: 'active',
      plan_id: 'libre'
    })
    .select()
    .single();

  if (tenantErr) {
    console.error('Failed to create tenant:', tenantErr);
    return;
  }
  console.log('Tenant created successfully. ID:', tenant.id);

  // 3. Create the Auth User
  console.log('Creating Auth User...');
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: 'Administrador Global',
      role: 'admin'
    }
  });

  if (createError) {
    console.error('Failed to create auth user:', createError);
    return;
  }

  const userId = createData.user.id;
  console.log('Auth user created successfully! ID:', userId);

  // 4. Associate Profile and Tenant
  console.log('Linking profile to the admin tenant...');
  // Wait a moment for trigger execution
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Check if profile exists
  const { data: profile, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (pError) {
    console.log('Profile not found from trigger, inserting manually...');
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        tenant_id: tenant.id,
        email,
        full_name: 'Administrador Global',
        role: 'admin',
        cuit: '99999999999',
        phone: '1199999999',
        provincia: 'CIUDAD AUTONOMA DE BUENOS AIRES',
        localidad: 'BALVANERA',
        birth_date: '1990-01-01'
      });
    if (insertError) {
      console.error('Failed to create profile manually:', insertError);
      return;
    }
  } else {
    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        tenant_id: tenant.id,
        role: 'admin',
        cuit: '99999999999',
        phone: '1199999999',
        provincia: 'CIUDAD AUTONOMA DE BUENOS AIRES',
        localidad: 'BALVANERA',
        birth_date: '1990-01-01'
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to link profile to tenant:', updateError);
      return;
    }
  }

  console.log('\n--- Setup completed successfully! ---');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Slug / URL Workspace: http://localhost:3000/${slug}/dashboard`);
}

run();
