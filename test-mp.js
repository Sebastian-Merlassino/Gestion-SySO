// test-mp.js
const { MercadoPagoConfig, PreApproval } = require('mercadopago');

const accessToken = "APP_USR-4657236184709831-071013-74ff4fdee15eb5378bbdfb3590a8781f-3533829848";

const client = new MercadoPagoConfig({
  accessToken: accessToken,
  options: {
    timeout: 5000
  }
});

const preApprovalClient = new PreApproval(client);

async function run() {
  try {
    console.log('Llamando a PreApproval.create con el email del Buyer Test User de Sebastian...');
    const response = await preApprovalClient.create({
      body: {
        payer_email: "test_user_3533829850@testuser.com", // El email oficial del Buyer con ID 3533829850
        back_url: "https://gestionsyso.com/test-slug/profile",
        reason: "Suscripción Mensual - Plan Básico (Test)",
        external_reference: JSON.stringify({ tenant_id: "test-tenant-id", plan_id: "basic_5" }),
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 25000,
          currency_id: "ARS"
        },
        status: "pending"
      }
    });
    console.log('¡Éxito total!', response);
  } catch (error) {
    console.error('Error al crear PreApproval:', error);
    if (error.response) {
      console.error('Detalles de la respuesta de error de Mercado Pago:', JSON.stringify(error.response, null, 2));
    } else {
      console.error('Detalles completos:', error);
    }
  }
}

run();
