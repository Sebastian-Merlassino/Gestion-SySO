const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * @typedef {Object} GeografiaSelection
 * @property {string} provincia - Nombre de la provincia
 * @property {string} localidad - Nombre de la localidad/departamento
 */

/**
 * @typedef {Object} LogoItem
 * @property {string} tipo - Tipo de logo (ej. 'principal', 'secundario')
 * @property {string} url - URL de la imagen del logo
 */

/**
 * @typedef {Object} MatriculaItem
 * @property {string} entidadEmisora - Nombre de la entidad que emite la matrícula
 * @property {string} numero - Número identificador de la matrícula
 * @property {string} vencimiento - Fecha de vencimiento
 * @property {string} frenteURL - URL de la imagen del frente de la matrícula
 * @property {string} dorsoURL - URL de la imagen del dorso de la matrícula
 */

/**
 * Registra un nuevo usuario en la base de datos de MongoDB.
 * Asigna automáticamente un plan 'FREE_TRIAL' con vigencia de 15 días desde la fecha de registro.
 *
 * @param {import('express').Request} req - Solicitud de Express conteniendo los datos de usuario en req.body.
 * @param {import('express').Response} res - Respuesta de Express.
 * @returns {Promise<void>}
 */
const registerUser = async (req, res) => {
  try {
    const { uid, nombreApellido, celular, fechaNacimiento, cuit, geografia, logos, matriculas } = req.body;

    if (!uid || !nombreApellido || !cuit) {
      return res.status(400).json({
        success: false,
        message: 'Los campos uid, nombreApellido y cuit son obligatorios.'
      });
    }

    // Comprobar si el usuario ya existe por UID
    let existingUser = await User.findOne({ uid });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya se encuentra registrado con este UID.'
      });
    }

    // Crear el nuevo usuario
    const newUser = new User({
      uid,
      nombreApellido,
      celular,
      fechaNacimiento,
      cuit,
      geografia,
      logos: logos || [],
      matriculas: matriculas || [],
      plan: {
        tipo: 'FREE_TRIAL',
        estado: 'ACTIVO',
        fechaVencimiento: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 días
      }
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente en la plataforma',
      user: newUser
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al registrar el usuario',
      error: error.message
    });
  }
};

/**
 * Obtiene todos los documentos geográficos de la colección 'geografia'.
 * Permite al frontend construir los selectores dependientes de provincias/departamentos/localidades.
 *
 * @param {import('express').Request} req - Solicitud de Express.
 * @param {import('express').Response} res - Respuesta de Express.
 * @returns {Promise<void>}
 */
const getGeografia = async (req, res) => {
  try {
    const geoData = await mongoose.connection.db.collection('geografia').find({}).toArray();
    return res.status(200).json({
      success: true,
      data: geoData
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener datos geográficos',
      error: error.message
    });
  }
};

module.exports = {
  registerUser,
  getGeografia
};
