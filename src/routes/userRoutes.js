const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { 
  getRemainingTrialDays, 
  verifyTrialExpiration, 
  createSubscriptionPreference 
} = require('../services/subscriptionService');

// @route   POST /api/users
// @desc    Register a new user in MongoDB (associated with Firebase UID)
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { nombre, cuit, telefonos, firebaseUid } = req.body;

    if (!nombre || !cuit || !firebaseUid) {
      return res.status(400).json({ success: false, message: 'Nombre, CUIT y firebaseUid son obligatorios' });
    }

    // Check if user already exists
    let user = await User.findOne({ firebaseUid });
    if (user) {
      return res.status(400).json({ success: false, message: 'El usuario ya está registrado' });
    }

    user = new User({
      nombre,
      cuit,
      telefonos: telefonos || [],
      firebaseUid,
      tipoPlan: 'free-trial',
      estadoSuscripcion: 'active',
      trialStartDate: new Date(),
      // trialEndDate is automatically set to 15 days from now by the schema default
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/users/:id/status
// @desc    Get user trial and subscription status
// @access  Public
router.get('/:id/status', async (req, res) => {
  try {
    const user = await verifyTrialExpiration(req.targetUserId || req.params.id);
    const remainingDays = getRemainingTrialDays(user);

    res.json({
      success: true,
      nombre: user.nombre,
      tipoPlan: user.tipoPlan,
      estadoSuscripcion: user.estadoSuscripcion,
      trialEndDate: user.trialEndDate,
      remainingDays: remainingDays,
      isTrialActive: remainingDays > 0 && user.tipoPlan === 'free-trial'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/subscriptions/preference
// @desc    Create Mercado Pago preference for a subscription plan
// @access  Public
router.post('/preference', async (req, res) => {
  try {
    const { userId, planType } = req.body;

    if (!userId || !planType) {
      return res.status(400).json({ success: false, message: 'userId y planType son obligatorios' });
    }

    const mpPreference = await createSubscriptionPreference(userId, planType);

    res.json({
      success: true,
      preferenceId: mpPreference.id,
      initPoint: mpPreference.init_point,
      sandboxInitPoint: mpPreference.sandbox_init_point
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
