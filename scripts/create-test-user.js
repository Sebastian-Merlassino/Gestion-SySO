// scripts/create-test-user.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Admin key

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const email = 'test-login@example.com';
  const password = 'password123';

  console.log(`Checking if user ${email} already exists...`);
  // Delete existing if any
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list users:', listError);
    return;
  }

  const existingUser = users.users.find(u => u.email === email);
  if (existingUser) {
    console.log('User already exists, deleting it first to start clean...');
    await supabase.auth.admin.deleteUser(existingUser.id);
  }

  console.log('Creating new auth user...');
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: 'Test Login User'
    }
  });

  if (createError) {
    console.error('Failed to create auth user:', createError);
    return;
  }

  const userId = createData.user.id;
  console.log('Auth user created successfully! ID:', userId);

  // Profile is created automatically by the trigger! Let's verify it.
  console.log('Verifying if profile was created by trigger...');
  const { data: profile, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (pError) {
    console.log('Profile not found, creating manually...');
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: 'Test Login User',
        role: 'owner'
      });
    if (insertError) {
      console.error('Failed to create profile row manually:', insertError);
      return;
    }
    console.log('Profile row created manually.');
  } else {
    console.log('Profile row found in DB:', profile);
  }

  console.log('\n--- Setup completed! User: test-login@example.com / Password: password123 ---');
}

run();
