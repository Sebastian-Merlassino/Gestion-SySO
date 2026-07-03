const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Manual dependency-free .env loader
try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8')
      .split('\n')
      .forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let val = match[2] || '';
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          process.env[key] = val;
        }
      });
  }
} catch (e) {
  console.log('No se pudo cargar el archivo .env automáticamente:', e.message);
}

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function runTests() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Conectado a la base de datos local para pruebas de seguridad...');
  } catch (e) {
    console.error('Error al conectar con la base de datos local:', e.message);
    console.error('Asegúrate de tener Supabase local corriendo (supabase start).');
    process.exit(1);
  }

  console.log('\n=========================================');
  console.log('   INICIANDO PRUEBAS DE SEGURIDAD RLS    ');
  console.log('=========================================\n');

  let failed = false;

  // Test 1: Acceso Anónimo
  try {
    console.log('Test 1: Verificando restricciones de acceso anónimo...');
    await client.query('BEGIN;');
    await client.query("SET LOCAL role = 'anon';");
    const { rows: profiles } = await client.query('SELECT * FROM public.profiles;');
    const { rows: audits } = await client.query('SELECT * FROM public.audits;');
    await client.query('COMMIT;');
    
    if (profiles.length > 0 || audits.length > 0) {
      throw new Error('El usuario anónimo pudo leer perfiles o auditorías.');
    }
    console.log('👉 [OK] Restricciones anónimas validadas.');
  } catch (err) {
    await client.query('ROLLBACK;').catch(() => {});
    console.error('❌ [FAIL] Test 1 falló:', err.message);
    failed = true;
  }

  // Test 2: Aislamiento Cross-Tenant
  try {
    console.log('\nTest 2: Verificando aislamiento cross-tenant (Tenant A no lee Tenant B)...');
    await client.query('BEGIN;');
    // Carlos Gómez (Admin ACME, tenant_id = '4a946b5d-ea82-411a-8bb7-eb1ffb2f567b')
    await client.query("SET LOCAL request.jwt.claim.sub = 'd290f1ee-6c54-4b01-90e6-d701748f0851';");
    await client.query("SET LOCAL role = 'authenticated';");
    
    const { rows: audits } = await client.query('SELECT * FROM public.audits;');
    const hasTenantBAudit = audits.some(a => a.tenant_id === '7b38dcd3-fb13-4318-8f83-9b6d859cebe0');
    await client.query('COMMIT;');

    if (hasTenantBAudit) {
      throw new Error('El usuario del Tenant A pudo ver registros del Tenant B.');
    }
    console.log(`👉 [OK] Aislamiento cross-tenant validado (se encontraron ${audits.length} auditorías del Tenant A, 0 del Tenant B).`);
  } catch (err) {
    await client.query('ROLLBACK;').catch(() => {});
    console.error('❌ [FAIL] Test 2 falló:', err.message);
    failed = true;
  }

  // Test 3: Prevención de Escalamiento de Privilegios (Modificar Rol Propio)
  try {
    console.log('\nTest 3: Verificando bloqueo de cambio de rol propio (Escalamiento de Privilegios)...');
    await client.query('BEGIN;');
    // María Rodríguez (Inspector ACME, id = 'f3b92f7b-90f1-4db8-b4b3-d6c579198642')
    await client.query("SET LOCAL request.jwt.claim.sub = 'f3b92f7b-90f1-4db8-b4b3-d6c579198642';");
    await client.query("SET LOCAL role = 'authenticated';");

    let promotionFailed = false;
    try {
      await client.query("UPDATE public.profiles SET role = 'admin' WHERE id = 'f3b92f7b-90f1-4db8-b4b3-d6c579198642';");
    } catch (e) {
      promotionFailed = true;
      console.log('   (Error esperado capturado):', e.message);
    }
    await client.query('ROLLBACK;');

    if (!promotionFailed) {
      throw new Error('El inspector pudo promoverse a sí mismo a administrador.');
    }
    console.log('👉 [OK] Modificación de rol propio bloqueada exitosamente.');
  } catch (err) {
    await client.query('ROLLBACK;').catch(() => {});
    console.error('❌ [FAIL] Test 3 falló:', err.message);
    failed = true;
  }

  // Test 4: Prevención de Bypass de Plan Comercial (Modificar plan_id en tenants)
  try {
    console.log('\nTest 4: Verificando bloqueo de bypass de plan (Cambio directo de plan_id)...');
    await client.query('BEGIN;');
    // Carlos Gómez (Admin ACME, id = 'd290f1ee-6c54-4b01-90e6-d701748f0851')
    await client.query("SET LOCAL request.jwt.claim.sub = 'd290f1ee-6c54-4b01-90e6-d701748f0851';");
    await client.query("SET LOCAL role = 'authenticated';");

    let planChangeFailed = false;
    try {
      await client.query("UPDATE public.tenants SET plan_id = 'libre' WHERE id = '4a946b5d-ea82-411a-8bb7-eb1ffb2f567b';");
    } catch (e) {
      planChangeFailed = true;
      console.log('   (Error esperado capturado):', e.message);
    }
    await client.query('ROLLBACK;');

    if (!planChangeFailed) {
      throw new Error('El usuario pudo actualizar el plan comercial (plan_id) directamente.');
    }
    console.log('👉 [OK] Modificación directa del plan comercial bloqueada exitosamente.');
  } catch (err) {
    await client.query('ROLLBACK;').catch(() => {});
    console.error('❌ [FAIL] Test 4 falló:', err.message);
    failed = true;
  }

  console.log('\n=========================================');
  if (failed) {
    console.log(' ❌ FALLO DE SEGURIDAD DETECTADO EN TESTS ');
    console.log('=========================================\n');
    process.exit(1);
  } else {
    console.log('  ✅ TODAS LAS PRUEBAS PASARON CON ÉXITO ');
    console.log('=========================================\n');
    process.exit(0);
  }
}

runTests();
