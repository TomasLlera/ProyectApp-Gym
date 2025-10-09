// src/models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'El cliente es obligatorio']
  },
  monto: {
    type: Number,
    required: [true, 'El monto es obligatorio'],
    min: [0, 'El monto no puede ser negativo']
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  metodoPago: {
    type: String,
    enum: ['efectivo', 'tarjeta', 'transferencia', 'mercadopago'],
    default: 'efectivo'
  },
  estado: {
    type: String,
    enum: ['confirmado', 'pendiente', 'rechazado'],
    default: 'confirmado'
  },
  notas: {
    type: String,
    maxLength: 200
  },
  mes: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  año: {
    type: Number,
    required: true,
    min: 2024
  },
  recibo: {
    numero: String,
    url: String // Para guardar PDF o imagen del recibo
  }
}, {
  timestamps: true
});

// Índice compuesto para evitar pagos duplicados del mismo mes
paymentSchema.index({ cliente: 1, mes: 1, año: 1 }, { unique: true });

// Índices para búsquedas
paymentSchema.index({ fecha: -1 });
paymentSchema.index({ estado: 1 });
paymentSchema.index({ metodoPago: 1 });

// Método para formatear monto
paymentSchema.methods.getMontoFormateado = function() {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(this.monto);
};

module.exports = mongoose.model('Payment', paymentSchema);