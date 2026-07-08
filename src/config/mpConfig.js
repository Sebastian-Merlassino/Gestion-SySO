import { MercadoPagoConfig, Preference } from 'mercadopago';

// Inicialización de Mercado Pago con Token de Acceso
const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
if (!accessToken) {
  throw new Error('Crítico: La variable de entorno MERCADO_PAGO_ACCESS_TOKEN no está definida.');
}

export const client = new MercadoPagoConfig({
  accessToken: accessToken,
  options: {
    timeout: 5000
    // La clave de idempotencia se inyecta de forma dinámica para cada transacción y no de forma estática en la inicialización
  }
});

// Crear instancia de preferencia
export const preference = new Preference(client);
