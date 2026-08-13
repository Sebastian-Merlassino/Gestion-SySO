import { MercadoPagoConfig, Preference } from 'mercadopago';

// Inicialización de Mercado Pago con Token de Acceso
const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';

if (!accessToken) {
  console.warn('⚠️ [mpConfig] La variable de entorno MERCADO_PAGO_ACCESS_TOKEN no está definida.');
}

export const client = new MercadoPagoConfig({
  accessToken: accessToken,
  options: {
    timeout: 5000
  }
});

// Crear instancia de preferencia
export const preference = new Preference(client);

