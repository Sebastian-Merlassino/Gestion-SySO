const { MercadoPagoConfig, Preference } = require('mercadopago');
require('dotenv').config();

// Initialize Mercado Pago client with the access token from environment variables
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || 'TEST-54321-REPLACE-THIS-TOKEN-WITH-YOURS'
});

// Create a preference instance
const preference = new Preference(client);

module.exports = {
  client,
  preference
};
