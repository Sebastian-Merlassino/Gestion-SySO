const User = require('../models/User');
const { preference } = require('../config/mpConfig');

/**
 * Calculates remaining trial days for a user.
 * @param {Object} user - The user mongoose document
 * @returns {number} Remaining days (can be negative if expired)
 */
const getRemainingTrialDays = (user) => {
  if (user.tipoPlan !== 'free-trial') return 0;
  const now = new Date();
  const timeDiff = user.trialEndDate - now;
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  return daysDiff;
};

const verifyTrialExpiration = async (userIdOrUid) => {
  const mongoose = require('mongoose');
  let user;

  if (mongoose.Types.ObjectId.isValid(userIdOrUid)) {
    user = await User.findById(userIdOrUid);
  } else {
    user = await User.findOne({ firebaseUid: userIdOrUid });
  }

  if (!user) throw new Error('Usuario no encontrado');

  if (user.tipoPlan === 'free-trial') {
    const now = new Date();
    if (now > user.trialEndDate && user.estadoSuscripcion !== 'expired') {
      user.estadoSuscripcion = 'expired';
      await user.save();
      console.log(`El trial para el usuario ${user.nombre} ha finalizado. Estado actualizado a 'expired'.`);
    }
  }

  return user;
};

/**
 * Middleware to restrict access to active/paid subscribers or active trials.
 */
const requireActiveSubscription = async (req, res, next) => {
  try {
    // Assuming auth middleware has set req.user or req.userId
    const userId = req.headers['x-user-id'] || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autorizado. Se requiere identificación de usuario.' });
    }

    const user = await verifyTrialExpiration(userId);

    // Active check:
    // 1. If basic/premium, subscription state must be 'active'.
    // 2. If free-trial, state must be 'active' (not expired).
    if (user.estadoSuscripcion !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Tu prueba de 15 días o suscripción de pago ha caducado.',
        trialEnded: user.tipoPlan === 'free-trial',
        tipoPlan: user.tipoPlan,
        estadoSuscripcion: user.estadoSuscripcion
      });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Creates a Mercado Pago preference for a plan subscription.
 * @param {string} userId - User ID to associate with external reference
 * @param {string} planType - 'basic' | 'premium'
 * @returns {Promise<Object>} The preference object from Mercado Pago
 */
const createSubscriptionPreference = async (userId, planType) => {
  let price = 0;
  let title = '';

  if (planType === 'basic') {
    price = 4500; // Example ARS price
    title = 'Plan Básico Gestión SySO';
  } else if (planType === 'premium') {
    price = 8500; // Example ARS price
    title = 'Plan Premium Gestión SySO';
  } else {
    throw new Error('Tipo de plan no válido');
  }

  const preferenceData = {
    body: {
      items: [
        {
          id: planType,
          title: title,
          quantity: 1,
          unit_price: price,
          currency_id: 'ARS'
        }
      ],
      external_reference: userId.toString(),
      back_urls: {
        success: 'https://gestion-syso-app.web.app/payment/success',
        failure: 'https://gestion-syso-app.web.app/payment/failure',
        pending: 'https://gestion-syso-app.web.app/payment/pending'
      },
      auto_return: 'approved',
      notification_url: 'https://api.gestion-syso-app.com/api/payments/webhook' // Replace with your real webhook URL
    }
  };

  const response = await preference.create(preferenceData);
  return response;
};

module.exports = {
  getRemainingTrialDays,
  verifyTrialExpiration,
  requireActiveSubscription,
  createSubscriptionPreference
};
