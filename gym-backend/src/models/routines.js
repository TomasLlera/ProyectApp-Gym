// src/models/Routine.js - ARCHIVO NUEVO

const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: String,
  series: {
    type: Number,
    required: true,
    min: 1
  },
  repeticiones: String, // "10-12" o "15"
  peso: {
    type: String,
    default: 'A definir'
  },
  descanso: {
    type: String,
    default: '60 seg'
  },
  grupoMuscular: {
    type: String,
    enum: ['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'abdominales', 'cardio', 'fullbody'],
    required: true
  },
  videoUrl: String,
  notas: String,
  orden: {
    type: Number,
    default: 0
  }
});

const routineSchema = new mongoose.Schema({
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: String,
  tipo: {
    type: String,
    enum: ['fuerza', 'hipertrofia', 'resistencia', 'cardio', 'funcional', 'personalizado'],
    default: 'personalizado'
  },
  nivel: {
    type: String,
    enum: ['principiante', 'intermedio', 'avanzado'],
    default: 'principiante'
  },
  diasSemana: [{
    type: String,
    enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
  }],
  ejercicios: [exerciseSchema],
  duracionEstimada: {
    type: Number,
    default: 60
  },
  activa: {
    type: Boolean,
    default: true
  },
  fechaInicio: {
    type: Date,
    default: Date.now
  },
  notas: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

routineSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Fix para evitar error de overwrite
module.exports = mongoose.models.Routine || mongoose.model('Routine', routineSchema);