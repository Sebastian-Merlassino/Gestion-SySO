const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load .env variables
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getGoogleDriveDownloadUrl(url) {
  const fileIdMatch = url.match(/\/file\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
  if (fileIdMatch) {
    const fileId = fileIdMatch[1];
    return `https://docs.google.com/uc?export=download&id=${fileId}`;
  }
  return url;
}

function getExtensionFromMimeType(mimeType, defaultExt = 'bin') {
  if (!mimeType) return defaultExt;
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('gif')) return 'gif';
  return defaultExt;
}

async function run() {
  console.log('Fetching users and profiles to build tenant mappings...');
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, tenant_id, role');

  if (profErr) {
    console.error('Error fetching profiles:', profErr);
    process.exit(1);
  }

  // Create a map: tenant_id -> list of profile IDs (preferring owner, then admin, then first profile)
  const tenantProfiles = {};
  profiles.forEach(p => {
    if (!p.tenant_id) return;
    if (!tenantProfiles[p.tenant_id]) {
      tenantProfiles[p.tenant_id] = [];
    }
    tenantProfiles[p.tenant_id].push(p);
  });

  const getProfileForTenant = (tenantId) => {
    const plist = tenantProfiles[tenantId] || [];
    if (plist.length === 0) return null;
    const owner = plist.find(p => p.role === 'owner');
    if (owner) return owner.id;
    const admin = plist.find(p => p.role === 'admin');
    if (admin) return admin.id;
    return plist[0].id;
  };

  console.log('Tenant-profile mapping complete.');

  // ========================================================
  // 1. MIGRAR IMÁGENES EN ACCIONES CORRECTIVAS
  // ========================================================
  console.log('\n--- Migrating Acciones Correctivas Images ---');
  const { data: correctivas, error: corrErr } = await supabase
    .from('acciones_correctivas')
    .select('id, tenant_id, imagen_url')
    .not('imagen_url', 'is', null)
    .ilike('imagen_url', 'http%');

  if (corrErr) {
    console.error('Error fetching correctivas:', corrErr);
  } else {
    console.log(`Found ${correctivas.length} corrective actions with external image URLs.`);
    
    let corrSuccessCount = 0;
    for (const corr of correctivas) {
      const profileId = getProfileForTenant(corr.tenant_id);
      if (!profileId) {
        console.warn(`[SKIP] No user profile found for tenant ${corr.tenant_id} on corrective action ${corr.id}.`);
        continue;
      }

      const rawUrl = corr.imagen_url;
      const downloadUrl = getGoogleDriveDownloadUrl(rawUrl);
      console.log(`\nProcessing Action ${corr.id}:`);
      console.log(`- Original URL: ${rawUrl}`);
      console.log(`- Download URL: ${downloadUrl}`);
      
      try {
        const res = await fetch(downloadUrl);
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        
        const contentType = res.headers.get('content-type');
        const ext = getExtensionFromMimeType(contentType, 'jpg');
        const buffer = Buffer.from(await res.arrayBuffer());
        
        const storagePath = `${profileId}/corrective_${corr.id}.${ext}`;
        console.log(`- Downloading complete. Size: ${buffer.length} bytes. Uploading to: ${storagePath}...`);
        
        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(storagePath, buffer, {
            contentType: contentType || 'image/jpeg',
            upsert: true
          });
        
        if (uploadErr) throw uploadErr;
        
        console.log('- Upload successful. Updating database record...');
        const { error: updateErr } = await supabase
          .from('acciones_correctivas')
          .update({ imagen_url: storagePath })
          .eq('id', corr.id);
          
        if (updateErr) throw updateErr;
        
        console.log(`- Success! Corrective action ${corr.id} updated.`);
        corrSuccessCount++;
      } catch (err) {
        console.error(`- [ERROR] Failed to migrate corrective action ${corr.id}:`, err.message);
      }
    }
    console.log(`\nMigrated ${corrSuccessCount}/${correctivas.length} corrective action images.`);
  }

  // ========================================================
  // 2. MIGRAR DOCUMENTOS EN PROGRAMA ANUAL
  // ========================================================
  console.log('\n--- Migrating Programa Anual Documents ---');
  const { data: programaAnual, error: progErr } = await supabase
    .from('programa_anual')
    .select('id, tenant_id, documento_url')
    .not('documento_url', 'is', null)
    .ilike('documento_url', 'http%');

  if (progErr) {
    console.error('Error fetching programa_anual:', progErr);
  } else {
    console.log(`Found ${programaAnual.length} annual program items with external document URLs.`);
    
    let progSuccessCount = 0;
    for (const prog of programaAnual) {
      const profileId = getProfileForTenant(prog.tenant_id);
      if (!profileId) {
        console.warn(`[SKIP] No user profile found for tenant ${prog.tenant_id} on program item ${prog.id}.`);
        continue;
      }

      const rawUrl = prog.documento_url;
      const downloadUrl = getGoogleDriveDownloadUrl(rawUrl);
      console.log(`\nProcessing Program ${prog.id}:`);
      console.log(`- Original URL: ${rawUrl}`);
      console.log(`- Download URL: ${downloadUrl}`);
      
      try {
        const res = await fetch(downloadUrl);
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        
        const contentType = res.headers.get('content-type');
        const ext = getExtensionFromMimeType(contentType, 'pdf');
        const buffer = Buffer.from(await res.arrayBuffer());
        
        const storagePath = `${profileId}/programa_${prog.id}.${ext}`;
        console.log(`- Downloading complete. Size: ${buffer.length} bytes. Uploading to: ${storagePath}...`);
        
        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(storagePath, buffer, {
            contentType: contentType || 'application/pdf',
            upsert: true
          });
        
        if (uploadErr) throw uploadErr;
        
        console.log('- Upload successful. Updating database record...');
        const { error: updateErr } = await supabase
          .from('programa_anual')
          .update({ documento_url: storagePath })
          .eq('id', prog.id);
          
        if (updateErr) throw updateErr;
        
        console.log(`- Success! Program item ${prog.id} updated.`);
        progSuccessCount++;
      } catch (err) {
        console.error(`- [ERROR] Failed to migrate program item ${prog.id}:`, err.message);
      }
    }
    console.log(`\nMigrated ${progSuccessCount}/${programaAnual.length} program documents.`);
  }

  console.log('\nMigration script complete!');
}

run();
