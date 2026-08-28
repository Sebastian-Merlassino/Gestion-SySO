// src/lib/arca/arcaClient.js
// Server-side only — Direct native ARCA client (WSAA + WSFEv1 SOAP)
import { createClient } from '@supabase/supabase-js';
import { getTicketAcceso } from './wsaa.js';
import { WsfeClient } from './wsfe.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Create a service-role Supabase client for accessing private Storage
 * (certificates are stored in a private bucket accessible only via service_role)
 */
function getServiceClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurado. Se requiere para acceder a los certificados ARCA.');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Downloads text content (PEM string) directly from Supabase Storage private bucket
 */
async function downloadCertText(serviceClient, storagePath) {
  const { data, error } = await serviceClient.storage
    .from('arca-certificates')
    .download(storagePath);

  if (error || !data) {
    throw new Error(`No se pudo descargar el archivo ${storagePath} desde Storage: ${error?.message || 'archivo no encontrado'}`);
  }

  const text = await data.text();
  return text;
}

/**
 * Creates an initialized native ARCA client (WsfeClient) for a specific tenant.
 * Authenticates via WSAA (with local 12h TA caching) and connects directly to ARCA WSFEv1 SOAP.
 * 
 * @param {Object} arcaConfig - The tenant's ARCA configuration from DB
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.forceFresh] - If true, ignores cached TA and requests a fresh one
 * @returns {Promise<{wsfe: WsfeClient, afip: {ElectronicBilling: WsfeClient}, cleanup: Function}>}
 */
export async function createArcaClient(arcaConfig, options = {}) {
  const { forceFresh = false } = options;

  if (!arcaConfig.cert_storage_path || !arcaConfig.key_storage_path) {
    throw new Error('No se encontró certificado digital configurado. Por favor suba su certificado .crt y clave .key en la sección de Configuración.');
  }

  const cleanCuit = parseInt(String(arcaConfig.cuit).replace(/\D/g, ''), 10);
  const environment = arcaConfig.environment || 'produccion';
  const serviceClient = getServiceClient();

  // Download certificate and private key in parallel directly into memory
  const [certContent, keyContent] = await Promise.all([
    downloadCertText(serviceClient, arcaConfig.cert_storage_path),
    downloadCertText(serviceClient, arcaConfig.key_storage_path),
  ]);

  // 1. Get Ticket de Acceso (Token + Sign) from ARCA WSAA
  const auth = await getTicketAcceso({
    tenantId: arcaConfig.tenant_id,
    cuit: cleanCuit,
    certContent,
    keyContent,
    environment,
    service: 'wsfe',
    forceFresh,
  });

  // 2. Initialize native WSFE client
  const wsfe = new WsfeClient({
    cuit: cleanCuit,
    token: auth.token,
    sign: auth.sign,
    environment,
  });

  return {
    wsfe,
    // Alias for full backward compatibility with any existing callers:
    afip: { ElectronicBilling: wsfe },
    cleanup: () => {},
  };
}

/**
 * Checks if an error is a transient network error (safe to retry)
 */
export function isTransientError(error) {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();
  const code = (error.code || '').toLowerCase();

  const transientPatterns = [
    'econnrefused',
    'econnreset',
    'econnaborted',
    'etimedout',
    'enetunreach',
    'epipe',
    'socket hang up',
    'network error',
    'timeout',
    'getaddrinfo',
    'ehostunreach',
    'fetch failed',
  ];

  return transientPatterns.some((pattern) =>
    message.includes(pattern) || code.includes(pattern)
  );
}

/**
 * Checks if an error is an ARCA business rejection (NOT safe to retry)
 */
export function isArcaRejection(error) {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();
  return (
    message.includes('afip') ||
    message.includes('arca') ||
    message.includes('rechazo') ||
    Boolean(error.arcaErrors) ||
    Boolean(error.arcaObservations)
  );
}
