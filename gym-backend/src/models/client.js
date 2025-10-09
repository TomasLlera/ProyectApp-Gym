// src/models/Client.js
const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    maxLength: [50, 'El nombre no puede tener más de 50 caracteres']
  },
  apellido: {
    type: String,
    required: [true, 'El apellido es obligatorio'],
    trim: true,
    maxLength: [50, 'El apellido no puede tener más de 50 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  documento: {
    type: String,
    required: [true, 'El documento es obligatorio'],
    unique: true,
    trim: true
  },
  telefono: {
    type: String,
    trim: true
  },
  fechaNacimiento: {
    type: Date
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  },
  estadoPago: {
    type: String,
    enum: ['pagado', 'vencido', 'pendiente'],
    default: 'pendiente'
  },
  fechaUltimoPago: {
    type: Date
  },
  montoMensual: {
    type: Number,
    default: 3500,
    min: [0, 'El monto no puede ser negativo']
  },
  activo: {
    type: Boolean,
    default: true
  },
  notas: {
    type: String,
    maxLength: 500
  }
}, {
  timestamps: true // Crea automáticamente createdAt y updatedAt
});

// Método virtual para obtener nombre completo
clientSchema.virtual('nombreCompleto').get(function() {
  return `${this.nombre} ${this.apellido}`;
});

// Método para verificar si el pago está vencido
clientSchema.methods.isPagoVencido = function() {
  if (!this.fechaUltimoPago) return true;
  
  const fechaVencimiento = new Date(this.fechaUltimoPago);
  fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);
  
  return new Date() > fechaVencimiento;
};

// Índices para mejorar búsquedas
clientSchema.index({ email: 1 });
clientSchema.index({ documento: 1 });
clientSchema.index({ estadoPago: 1 });

module.exports = mongoose.model('Client', clientSchema);