const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: [true, 'El UID de Firebase Auth es obligatorio'],
    unique: true,
    trim: true
  },
  nombreApellido: {
    type: String,
    required: [true, 'El nombre y apellido es obligatorio'],
    trim: true
  },
  celular: {
    type: String,
    trim: true
  },
  fechaNacimiento: {
    type: Date
  },
  cuit: {
    type: String,
    required: [true, 'El CUIT es obligatorio'],
    unique: true,
    trim: true
  },
  geografia: {
    provincia: { type: String, trim: true },
    localidad: { type: String, trim: true }
  },
  logos: [{
    tipo: { type: String, trim: true },
    url: { type: String, trim: true }
  }],
  matriculas: [{
    entidadEmisora: { type: String, trim: true },
    numero: { type: String, trim: true },
    vencimiento: { type: Date },
    frenteURL: { type: String, trim: true },
    dorsoURL: { type: String, trim: true }
  }],
  plan: {
    tipo: {
      type: String,
      enum: ['FREE_TRIAL', 'BASIC', 'PRO'],
      default: 'FREE_TRIAL'
    },
    estado: {
      type: String,
      default: 'ACTIVO'
    },
    fechaVencimiento: {
      type: Date,
      default: () => new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 días en ms
    }
  }
}, {
  timestamps: true
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
