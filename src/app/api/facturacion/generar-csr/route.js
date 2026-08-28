// src/app/api/facturacion/generar-csr/route.js
// API Route for generating RSA 2048-bit Private Key and PKCS#10 Certificate Signing Request (CSR) for ARCA
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import forge from 'node-forge';

function createAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) { return cookieStore.get(name)?.value; },
      set(name, value, options) { try { cookieStore.set({ name, value, ...options }); } catch {} },
      remove(name, options) { try { cookieStore.set({ name, value: '', ...options }); } catch {} },
    },
  });
}

export async function POST(request) {
  try {
    const serverClient = createAuthClient();
    const { data: { user }, error: authError } = await serverClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { data: profile } = await serverClient
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.tenant_id || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Solo el administrador puede generar certificados.' }, { status: 403 });
    }

    const body = await request.json();
    const cuit = String(body.cuit || '').replace(/\D/g, '');
    const razonSocial = (body.razon_social || 'Consultoria SySO').trim();
    const alias = (body.alias || 'gestion-syso').trim().replace(/[^a-zA-Z0-9_-]/g, '-');

    if (!cuit || cuit.length !== 11) {
      return NextResponse.json({ error: 'Debe ingresar un CUIT válido de 11 dígitos para generar el CSR.' }, { status: 400 });
    }

    // 1. Generar par de claves RSA de 2048 bits
    const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });

    // 2. Crear solicitud de firma de certificado (CSR en formato PKCS#10)
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keypair.publicKey;
    csr.setSubject([
      { name: 'countryName', value: 'AR' },
      { name: 'organizationName', value: razonSocial },
      { name: 'commonName', value: alias },
      { name: 'serialNumber', value: `CUIT ${cuit}` },
    ]);

    // 3. Firmar el CSR con SHA-256 usando la clave privada
    csr.sign(keypair.privateKey, forge.md.sha256.create());

    // 4. Convertir a formato PEM
    const pemCsr = forge.pki.certificationRequestToPem(csr);
    const pemKey = forge.pki.privateKeyToPem(keypair.privateKey);

    return NextResponse.json({
      success: true,
      csr: pemCsr,
      key: pemKey,
      csr_filename: `pedido_${cuit}.csr`,
      key_filename: `privada_${cuit}.key`,
      instructions: [
        '1. Guarda el archivo .key en tu computadora (es tu clave privada y la necesitarás luego).',
        '2. Sube el archivo .csr en el portal de ARCA / AFIP (Administración de Certificados Digitales).',
        '3. ARCA generará tu certificado oficial .crt para descargar.',
        '4. Sube el certificado .crt y la clave .key en Gestión SySO para finalizar la conexión.'
      ]
    });
  } catch (err) {
    console.error('[API Generar CSR]', err);
    return NextResponse.json({ error: `Error generando CSR: ${err.message}` }, { status: 500 });
  }
}
