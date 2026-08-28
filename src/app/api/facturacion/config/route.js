// src/app/api/facturacion/config/route.js
// API Route for managing tenant ARCA configuration (fiscal data + certificates)
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { registrarAuditoria, extractRequestContext } from '@/lib/arca/arcaAudit';

const configSchema = z.object({
  cuit: z.number().int().positive('CUIT debe ser un número positivo.'),
  razon_social: z.string().min(1, 'La razón social o nombre legal es requerido.').max(200),
  nombre_fantasia: z.string().max(200).optional().nullable(),
  condicion_iva: z.enum(['responsable_inscripto', 'monotributista', 'exento', 'no_responsable', 'consumidor_final']),
  punto_venta: z.number().int().min(1).max(99999),
  domicilio_comercial: z.string().max(500).optional().nullable(),
  inicio_actividades: z.string().optional().nullable(), // ISO date string
  ingresos_brutos: z.string().max(50).optional().nullable(),
  environment: z.enum(['homologacion', 'produccion']).optional(),
});

/**
 * Creates an authenticated Supabase server client from cookies
 */
function createAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) { return cookieStore.get(name)?.value; },
      set(name, value, options) { cookieStore.set({ name, value, ...options }); },
      remove(name, options) { cookieStore.set({ name, value: '', ...options }); },
    },
  });
}

/**
 * GET /api/facturacion/config
 * Retrieves the ARCA configuration for the authenticated user's tenant.
 * Does NOT expose cert/key storage paths to the client.
 */
export async function GET() {
  try {
    const serverClient = createAuthClient();
    const { data: { user }, error: authError } = await serverClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ config: null });
    }

    const { data: profile } = await serverClient
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.tenant_id) {
      return NextResponse.json({ config: null });
    }

    const { data: config, error } = await serverClient
      .from('tenant_arca_config')
      .select('id, cuit, razon_social, condicion_iva, punto_venta, domicilio_comercial, inicio_actividades, ingresos_brutos, environment, is_active, created_at, updated_at, cert_storage_path, key_storage_path')
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle();

    if (error) {
      console.warn('[API Facturación Config GET]', error.message);
      return NextResponse.json({ config: null });
    }

    // Return config but mask sensitive paths (only expose whether they exist)
    const safeConfig = config ? {
      ...config,
      has_certificate: !!config.cert_storage_path,
      has_private_key: !!config.key_storage_path,
      cert_storage_path: undefined,
      key_storage_path: undefined,
    } : null;

    return NextResponse.json({ config: safeConfig });
  } catch (err) {
    console.error('[API Facturación Config GET]', err);
    return NextResponse.json({ config: null });
  }
}

/**
 * POST /api/facturacion/config
 * Creates or updates the ARCA configuration for the authenticated user's tenant.
 */
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
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'No se encontró tenant asociado.' }, { status: 403 });
    }

    // Only admin can configure
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Solo el administrador puede configurar la facturación.' }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = configSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({
        error: 'Datos inválidos.',
        details: parseResult.error.format(),
      }, { status: 400 });
    }

    const { nombre_fantasia, ...cleanConfigData } = parseResult.data;

    const configPayload = {
      tenant_id: profile.tenant_id,
      cuit: cleanConfigData.cuit,
      razon_social: cleanConfigData.razon_social,
      condicion_iva: cleanConfigData.condicion_iva,
      punto_venta: cleanConfigData.punto_venta,
      domicilio_comercial: cleanConfigData.domicilio_comercial || null,
      inicio_actividades: cleanConfigData.inicio_actividades || null,
      ingresos_brutos: cleanConfigData.ingresos_brutos || null,
      environment: cleanConfigData.environment || 'produccion',
    };

    const { ip_address, user_agent } = extractRequestContext(request);

    // Check if config already exists
    const { data: existing } = await serverClient
      .from('tenant_arca_config')
      .select('id, environment')
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle();

    let result;
    let accion;

    if (existing) {
      // Update existing config
      const { data, error } = await serverClient
        .from('tenant_arca_config')
        .update(configPayload)
        .eq('tenant_id', profile.tenant_id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: `Error al actualizar configuración: ${error.message}` }, { status: 500 });
      }
      result = data;
      accion = configPayload.environment !== existing.environment ? 'entorno_cambiado' : 'config_modificada';
    } else {
      // Create new config
      const { data, error } = await serverClient
        .from('tenant_arca_config')
        .insert(configPayload)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: `Error al crear configuración: ${error.message}` }, { status: 500 });
      }
      result = data;
      accion = 'config_creada';
    }

    // Audit log
    await registrarAuditoria(serverClient, {
      tenant_id: profile.tenant_id,
      accion,
      detalle: { cuit: configPayload.cuit, punto_venta: configPayload.punto_venta, environment: configPayload.environment },
      estado_anterior: existing?.environment || null,
      estado_nuevo: configPayload.environment || result.environment,
      ip_address,
      user_agent,
      performed_by: user.id,
    });

    return NextResponse.json({
      success: true,
      config: {
        ...result,
        has_certificate: !!result.cert_storage_path,
        has_private_key: !!result.key_storage_path,
        cert_storage_path: undefined,
        key_storage_path: undefined,
      },
    });
  } catch (err) {
    console.error('[API Facturación Config POST]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

/**
 * PUT /api/facturacion/config
 * Uploads certificate (.crt) and/or private key (.key) files
 * Expects multipart/form-data with 'cert' and/or 'key' file fields
 */
export async function PUT(request) {
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
      .single();

    if (!profile?.tenant_id || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Solo el administrador puede subir certificados.' }, { status: 403 });
    }

    const formData = await request.formData();
    const certFile = formData.get('cert');
    const keyFile = formData.get('key');

    if (!certFile && !keyFile) {
      return NextResponse.json({ error: 'Debe adjuntar al menos un archivo (certificado .crt o clave .key).' }, { status: 400 });
    }

    // Use service_role client for Storage operations (private bucket)
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const tenantId = profile.tenant_id;
    const updates = {};
    const { ip_address, user_agent } = extractRequestContext(request);

    // Ensure bucket exists
    try {
      await serviceClient.storage.createBucket('arca-certificates', { public: false });
    } catch {
      // Bucket already exists
    }

    // Upload certificate
    if (certFile && certFile.size > 0) {
      if (certFile.size > 50 * 1024) {
        return NextResponse.json({ error: 'El certificado excede el tamaño máximo de 50KB.' }, { status: 413 });
      }

      const certPath = `${tenantId}/cert.crt`;
      const certBuffer = Buffer.from(await certFile.arrayBuffer());

      const { error: uploadError } = await serviceClient.storage
        .from('arca-certificates')
        .upload(certPath, certBuffer, {
          contentType: 'application/x-pem-file',
          upsert: true,
        });

      if (uploadError) {
        return NextResponse.json({ error: `Error al subir certificado: ${uploadError.message}` }, { status: 500 });
      }

      updates.cert_storage_path = certPath;
    }

    // Upload private key
    if (keyFile && keyFile.size > 0) {
      if (keyFile.size > 50 * 1024) {
        return NextResponse.json({ error: 'La clave privada excede el tamaño máximo de 50KB.' }, { status: 413 });
      }

      const keyPath = `${tenantId}/key.key`;
      const keyBuffer = Buffer.from(await keyFile.arrayBuffer());

      const { error: uploadError } = await serviceClient.storage
        .from('arca-certificates')
        .upload(keyPath, keyBuffer, {
          contentType: 'application/pkcs8',
          upsert: true,
        });

      if (uploadError) {
        return NextResponse.json({ error: `Error al subir clave privada: ${uploadError.message}` }, { status: 500 });
      }

      updates.key_storage_path = keyPath;
    }

    // Update config with storage paths
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await serverClient
        .from('tenant_arca_config')
        .update(updates)
        .eq('tenant_id', tenantId);

      if (updateError) {
        return NextResponse.json({ error: `Error al actualizar configuración: ${updateError.message}` }, { status: 500 });
      }
    }

    // Audit log
    await registrarAuditoria(serverClient, {
      tenant_id: tenantId,
      accion: 'certificado_actualizado',
      detalle: {
        cert_updated: !!certFile,
        key_updated: !!keyFile,
      },
      ip_address,
      user_agent,
      performed_by: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Certificados actualizados correctamente.',
      has_certificate: !!updates.cert_storage_path || !!certFile,
      has_private_key: !!updates.key_storage_path || !!keyFile,
    });
  } catch (err) {
    console.error('[API Facturación Config PUT]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
