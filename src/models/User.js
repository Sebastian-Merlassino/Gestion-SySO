const mongoose = require('mongoose');

// Helper to validate Argentine CUIT (Format: XX-XXXXXXXX-X or 11 digits)
const validateCUIT = (cuit) => {
  const cleanCuit = cuit.replace(/\D/g, '');
  return cleanCuit.length === 11;
};

const LicenseSchema = new mongoose.Schema({
  numero: {
    type: String,
    required: true,
    trim: true
  },
  imagenFrente: {
    type: String, // URL to the front image
    required: true
  },
  imagenDorso: {
    type: String, // URL to the back image
    required: true
  },
  fechaVencimiento: {
    type: Date,
    required: true
  }
}, { _id: true });

const UserSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true
  },
  cuit: {
    type: String,
    required: [true, 'El CUIT es obligatorio'],
    unique: true,
    trim: true,
    validate: {
      validator: validateCUIT,
      message: props => `${props.value} no es un CUIT válido. Debe tener 11 dígitos.`
    }
  },
  telefonos: [{
    type: String,
    trim: true
  }],
  logos: [{
    type: String, // Array of logo URLs
    trim: true
  }],
  matriculas: [LicenseSchema],
  tipoPlan: {
    type: String,
    enum: ['free-trial', 'basic', 'premium'],
    default: 'free-trial'
  },
  estadoSuscripcion: {
    type: String,
    enum: ['active', 'expired', 'canceled'],
    default: 'active'
  },
  trialStartDate: {
    type: Date,
    default: Date.now
  },
  trialEndDate: {
    type: Date,
    default: () => {
      // Default to 15 days from now
      const date = new Date();
      date.setDate(date.getDate() + 15);
      return date;
    }
  },
  firebaseUid: {
    type: String,
    required: [true, 'El UID de Firebase Auth es obligatorio'],
    unique: true
  }
}, {
  timestamps: true
});

// Virtual to check if trial is active
UserSchema.virtual('isTrialActive').get(function() {
  if (this.tipoPlan !== 'free-trial') return false;
  return new Date() < this.trialEndDate;
});

// Middleware to automatically update subscription status if trial ended
UserSchema.pre('save', function() {
  if (this.tipoPlan === 'free-trial' && new Date() > this.trialEndDate) {
    this.estadoSuscripcion = 'expired';
  }
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
