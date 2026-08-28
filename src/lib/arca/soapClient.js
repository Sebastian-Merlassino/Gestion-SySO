// src/lib/arca/soapClient.js
// Native HTTPS SOAP client optimized for ARCA / AFIP servers (handles OpenSSL SECLEVEL=1 compatibility)
import https from 'https';
import xml2js from 'xml2js';

// Reusable agent with cipher compatibility for AFIP government servers
const httpsAgent = new https.Agent({
  ciphers: 'DEFAULT@SECLEVEL=1',
  keepAlive: true,
  timeout: 30000,
});

/**
 * Sends a SOAP POST request to an ARCA endpoint and returns parsed XML response
 * 
 * @param {string} url - Target URL (WSAA or WSFE)
 * @param {string} soapBody - Complete XML SOAP envelope
 * @param {string} soapAction - Optional SOAPAction header
 * @returns {Promise<{raw: string, parsed: Object, status: number}>}
 */
export async function postSoap(url, soapBody, soapAction = '') {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      agent: httpsAgent,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(soapBody, 'utf8'),
        ...(soapAction ? { 'SOAPAction': soapAction } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', async () => {
        try {
          const parsed = await xml2js.parseStringPromise(data, {
            explicitArray: false,
            ignoreAttrs: true,
          });

          if (res.statusCode >= 400) {
            // Extract SOAP fault if available
            const fault =
              parsed?.['soap:Envelope']?.['soap:Body']?.['soap:Fault'] ||
              parsed?.['soapenv:Envelope']?.['soapenv:Body']?.['soapenv:Fault'] ||
              parsed?.['Envelope']?.['Body']?.['Fault'];

            const faultMsg = fault?.faultstring || `HTTP ${res.statusCode}: ${res.statusMessage}`;
            const error = new Error(`ARCA SOAP Error (${res.statusCode}): ${faultMsg}`);
            error.statusCode = res.statusCode;
            error.fault = fault;
            error.raw = data;
            return reject(error);
          }

          resolve({
            raw: data,
            parsed,
            status: res.statusCode,
          });
        } catch (parseErr) {
          if (res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
          }
          reject(new Error(`Error parseando respuesta XML de ARCA: ${parseErr.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy(new Error('Timeout de conexión con servidores de ARCA (30s).'));
    });

    req.write(soapBody);
    req.end();
  });
}
