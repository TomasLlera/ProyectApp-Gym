// src/models/Group.js - ARCHIVO NUEVO

const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  clientes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  }],
  activo: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

groupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.models.Group || mongoose.model('Group', groupSchema);