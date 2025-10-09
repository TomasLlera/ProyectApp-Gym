// src/models/Routine.js
const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre del ejercicio es obligatorio'],
    trim: true
  },
  series: {
    type: Number,
    default: 3,
    min: [1, 'Debe tener al menos 1 serie']
  },
  repeticiones: {
    type: String, // "10-12" o "30 seg" o "hasta fallo"
    default: "10"
  },
  peso: {
    type: Number,
    default: 0,
    min: [0, 'El peso no puede ser negativo']
  },
  descanso: {
    type: Number, // en segundos
    default: 60,
    min: [0, 'El descanso no puede ser negativo']
  },
  notas: {
    type: String,
    maxLength: 100
  },
  completado: {
    type: Boolean,
    default: false
  }
});

const routineSchema = new mongoose.Schema({
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'El cliente es obligatorio']
  },
  fecha: {
    type: Date,
    required: [true, 'La fecha es obligatoria']
  },
  titulo: {
    type: String,
    required: [true, 'El título es obligatorio'],
    trim: true,
    maxLength: [100, 'El título no puede tener más de 100 caracteres']
  },
  tipo: {
    type: String,
    enum: ['cardio', 'fuerza', 'funcional', 'mixto', 'rehabilitacion'],
    default: 'mixto'
  },
  ejercicios: [exerciseSchema],
  duracionEstimada: {
    type: Number, // en minutos
    default: 60,
    min: [1, 'La duración debe ser al menos 1 minuto']
  },
  duracionReal: {
    type: Number, // en minutos - lo que realmente tardó
    min: [0, 'La duración real no puede ser negativa']
  },
  completada: {
    type: Boolean,
    default: false
  },
  calificacion: {
    type: Number,
    min: 1,
    max: 5
  },
  notas: {
    type: String,
    maxLength: 500
  },
  googleEventId: {
    type: String // ID del evento en Google Calendar
  },
  instructor: {
    type: String,
    default: 'Entrenador Personal'
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
routineSchema.index({ cliente: 1, fecha: -1 });
routineSchema.index({ fecha: -1 });
routineSchema.index({ tipo: 1 });
routineSchema.index({ completada: 1 });

// Método virtual para obtener progreso
routineSchema.virtual('progreso').get(function() {
  if (this.ejercicios.length === 0) return 0;
  
  const completados = this.ejercicios.filter(ej => ej.completado).length;
  return Math.round((completados / this.ejercicios.length) * 100);
});

// Método para marcar rutina como completada
routineSchema.methods.marcarCompletada = function() {
  this.completada = true;
  this.duracionReal = this.duracionReal || this.duracionEstimada;
  return this.save();
};

module.exports = mongoose.model('Routine', routineSchema);