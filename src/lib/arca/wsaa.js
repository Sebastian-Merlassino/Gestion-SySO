// src/lib/arca/wsaa.js
// Native Web Service de Autenticación y Autorización (WSAA) client for ARCA / AFIP
import forge from 'node-forge';
import xml2js from 'xml2js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { postSoap } from './soapClient.js';

const WSAA_URLS = {
  homologacion: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
  produccion: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
};

/**
 * Format a Date to ISO 8601 string with local timezone offset
 * e.g., 2026-08-27T17:50:00-03:00
 */
function toIsoOffsetString(date) {
  const tzOffset = -date.getTimezoneOffset();
  const diff = tzOffset >= 0 ? '+' : '-';
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0');

  return (
    date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds()) +
    diff + pad(tzOffset / 60) +
    ':' + pad(tzOffset % 60)
  );
}

/**
 * Creates the TRA (Ticket de Requerimiento de Acceso) XML
 */
function createTRA(service = 'wsfe') {
  const now = new Date();
  // Set generation time 10 minutes in the past to guard against NTP clock drift
  const genTime = new Date(now.getTime() - 10 * 60 * 1000);
  // Expiration time set to 10 minutes in future (WSAA will grant a 12-hour ticket)
  const expTime = new Date(now.getTime() + 10 * 60 * 1000);
  const uniqueId = Math.floor(now.getTime() / 1000);

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<loginTicketRequest version="1.0">\n' +
    '  <header>\n' +
    `    <uniqueId>${uniqueId}</uniqueId>\n` +
    `    <generationTime>${toIsoOffsetString(genTime)}</generationTime>\n` +
    `    <expirationTime>${toIsoOffsetString(expTime)}</expirationTime>\n` +
    '  </header>\n' +
    `  <service>${service}</service>\n` +
    '</loginTicketRequest>'
  );
}

/**
 * Signs the TRA XML using CMS/PKCS#7 with SHA-256 and the tenant's private key & certificate
 */
function signTRA(traXml, certPem, keyPem) {
  try {
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(traXml, 'utf8');

    const cert = forge.pki.certificateFromPem(certPem);
    const key = forge.pki.privateKeyFromPem(keyPem);

    p7.addCertificate(cert);
    p7.addSigner({
      key: key,
      certificate: cert,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data,
        },
        {
          type: forge.pki.oids.messageDigest,
        },
        {
          type: forge.pki.oids.signingTime,
          value: new Date(),
        },
      ],
    });

    p7.sign();
    const asn1 = p7.toAsn1();
    const der = forge.asn1.toDer(asn1).getBytes();
    return forge.util.encode64(der);
  } catch (err) {
    throw new Error(`Error firmando CMS con clave privada y certificado: ${err.message}`);
  }
}

/**
 * Sends the signed CMS to ARCA WSAA via SOAP and returns the parsed Token & Sign
 */
async function callWSAA(cmsBase64, environment = 'produccion') {
  const url = WSAA_URLS[environment] || WSAA_URLS.produccion;

  const soapEnvelope =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.afip.gov.ar">\n' +
    '  <soapenv:Header/>\n' +
    '  <soapenv:Body>\n' +
    '    <wsaa:loginCms>\n' +
    `      <wsaa:in0>${cmsBase64}</wsaa:in0>\n` +
    '    </wsaa:loginCms>\n' +
    '  </soapenv:Body>\n' +
    '</soapenv:Envelope>';

  const { parsed } = await postSoap(url, soapEnvelope, '""');

  const loginCmsReturn =
    parsed?.['soapenv:Envelope']?.['soapenv:Body']?.['loginCmsResponse']?.['loginCmsReturn'] ||
    parsed?.['soap:Envelope']?.['soap:Body']?.['loginCmsResponse']?.['loginCmsReturn'] ||
    parsed?.['Envelope']?.['Body']?.['loginCmsResponse']?.['loginCmsReturn'];

  if (!loginCmsReturn) {
    throw new Error('Respuesta inesperada de WSAA: no se encontró el elemento loginCmsReturn.');
  }

  // Parse inner LoginTicketResponse XML
  const inner = await xml2js.parseStringPromise(loginCmsReturn, { explicitArray: false });
  const credentials = inner?.loginTicketResponse?.credentials;
  const header = inner?.loginTicketResponse?.header;

  if (!credentials?.token || !credentials?.sign) {
    throw new Error('WSAA no devolvió token o sign en la respuesta.');
  }

  return {
    token: credentials.token,
    sign: credentials.sign,
    generationTime: header?.generationTime,
    expirationTime: header?.expirationTime,
  };
}

/**
 * Gets a cached or fresh Ticket de Acceso (TA) for the specified tenant & environment.
 * Reuses the token as long as it has at least 10 minutes before expiring.
 */
export async function getTicketAcceso({
  tenantId,
  cuit,
  certContent,
  keyContent,
  environment = 'produccion',
  service = 'wsfe',
  forceFresh = false,
}) {
  const cacheDir = path.join(os.tmpdir(), 'arca-ta-cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const cacheFile = path.join(cacheDir, `ta_${tenantId}_${environment}_${service}.json`);

  // 1. Check local cache
  if (!forceFresh && fs.existsSync(cacheFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (cached.token && cached.sign && cached.expirationTime) {
        const expDate = new Date(cached.expirationTime);
        const now = new Date();
        // If ticket is valid for at least another 10 minutes, return it
        if (expDate.getTime() - now.getTime() > 10 * 60 * 1000) {
          return {
            token: cached.token,
            sign: cached.sign,
            expirationTime: cached.expirationTime,
            fromCache: true,
          };
        }
      }
    } catch (err) {
      console.warn('[WSAA Cache] Error reading cache file, generating fresh TA:', err.message);
    }
  }

  // 2. Build and sign new TRA
  const traXml = createTRA(service);
  const cmsBase64 = signTRA(traXml, certContent, keyContent);

  // 3. Call WSAA
  const authData = await callWSAA(cmsBase64, environment);

  // 4. Save to cache
  try {
    fs.writeFileSync(
      cacheFile,
      JSON.stringify({
        token: authData.token,
        sign: authData.sign,
        generationTime: authData.generationTime,
        expirationTime: authData.expirationTime,
        updatedAt: new Date().toISOString(),
      }),
      'utf8'
    );
  } catch (err) {
    console.warn('[WSAA Cache] Error saving TA to disk cache:', err.message);
  }

  return {
    token: authData.token,
    sign: authData.sign,
    expirationTime: authData.expirationTime,
    fromCache: false,
  };
}
