const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Middleware para validar si la suscripción del usuario está activa.
 * Impide el paso si el estado del plan es 'VENCIDO'.
 * Si detecta que la fecha actual superó la fecha de vencimiento, actualiza
 * automáticamente el estado a 'VENCIDO' de forma idempotente en base de datos.
 *
 * @param {import('express').Request} req - Solicitud de Express.
 * @param {import('express').Response} res - Respuesta de Express.
 * @param {import('express').NextFunction} next - Función para continuar la ejecución de middlewares.
 * @returns {Promise<void|import('express').Response>}
 */
const checkSubscription = async (req, res, next) => {
  try {
    // Buscar UID desde las cabeceras, parámetros de query o cuerpo
    const uid = req.headers['x-user-uid'] || req.headers['x-user-id'] || req.query.uid || req.body.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Se requiere UID de usuario para validar suscripción.'
      });
    }

    // Buscar por el UID de Firebase o por el ObjectId de MongoDB en su defecto
    const isObjectId = mongoose.Types.ObjectId.isValid(uid);
    const user = await User.findOne({
      $or: [
        { uid: uid },
        isObjectId ? { _id: uid } : null
      ].filter(Boolean)
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Validación y auto-expiración basada en la fecha de vencimiento
    if (
      user.plan &&
      user.plan.fechaVencimiento &&
      new Date() > new Date(user.plan.fechaVencimiento) &&
      user.plan.estado !== 'VENCIDO'
    ) {
      user.plan.estado = 'VENCIDO';
      await user.save();
      console.log(`Plan del usuario ${user.nombreApellido} expiró automáticamente.`);
    }

    // Bloquear si el plan está vencido
    if (user.plan && user.plan.estado === 'VENCIDO') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Tu plan de suscripción ha vencido.',
        plan: user.plan
      });
    }

    // Adjuntar usuario verificado a la solicitud
    req.currentUser = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al verificar suscripción',
      error: error.message
    });
  }
};

module.exports = checkSubscription;
