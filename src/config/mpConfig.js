const { MercadoPagoConfig, Preference } = require('mercadopago');
require('dotenv').config();

// Inicialización de Mercado Pago con Token de Acceso
const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
if (!accessToken) {
  throw new Error('Crítico: La variable de entorno MERCADO_PAGO_ACCESS_TOKEN no está definida.');
}

const client = new MercadoPagoConfig({
  accessToken: accessToken,
  options: {
    timeout: 5000,
    idempotencyKey: 'mp-init-key'
  }
});

// Crear instancia de preferencia
const preference = new Preference(client);

module.exports = {
  client,
  preference
};
