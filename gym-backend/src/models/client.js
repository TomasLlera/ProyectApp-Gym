const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  documento: { type: String, required: true, unique: true },
  telefono: { type: String },

  // NUEVOS CAMPOS:
  tipoPlan: { 
    type: String, 
    enum: ['diario', 'semanal', 'quincenal', 'mensual', 'anual'],
    default: 'mensual'
  },
  montoMensual: { type: Number, required: true },
  fechaVencimiento: { type: Date }, // Próxima fecha de vencimiento
  
  estadoPago: {
    type: String,
    enum: ['pagado', 'vencido', 'pendiente'],
    default: 'pendiente'
  },
  fechaUltimoPago: { type: Date },
  fechaRegistro: { type: Date, default: Date.now },
  activo: { type: Boolean, default: true }
}, {
  timestamps: true
});

// MÉTODO PARA CALCULAR VENCIMIENTO DESDE LA FECHA DEL ÚLTIMO PAGO
clientSchema.methods.calcularProximoVencimiento = function() {
  const base = this.fechaUltimoPago ? new Date(this.fechaUltimoPago) : new Date();
  let proximoVencimiento = new Date(base);

  switch (this.tipoPlan) {
    case 'diario':
      proximoVencimiento.setDate(base.getDate() + 1);
      break;
    case 'semanal':
      proximoVencimiento.setDate(base.getDate() + 7);
      break;
    case 'quincenal':
      proximoVencimiento.setDate(base.getDate() + 15);
      break;
    case 'mensual':
      proximoVencimiento.setMonth(base.getMonth() + 1);
      break;
    case 'anual':
      proximoVencimiento.setFullYear(base.getFullYear() + 1);
      break;
  }

  this.fechaVencimiento = proximoVencimiento;
  return proximoVencimiento;
};

// MÉTODO PARA ACTUALIZAR EL ESTADO DEL PAGO AUTOMÁTICAMENTE
clientSchema.methods.actualizarEstadoPago = function() {
  const hoy = new Date();
  if (!this.fechaVencimiento) {
    this.estadoPago = 'pendiente';
  } else if (hoy > this.fechaVencimiento) {
    this.estadoPago = 'vencido';
  } else {
    this.estadoPago = 'pagado';
  }
  return this.estadoPago;
};

module.exports = mongoose.model('Client', clientSchema);
