// src/app.js
const express = require("express");
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const app = express();

// Middleware de seguridad
app.use(helmet());
app.use(compression());

// CORS - permitir requests desde React Native
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Ruta de prueba básica
app.get('/', (req, res) => {
  res.json({ 
    message: '🏋️‍♂️ API Gimnasio funcionando correctamente',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      hello: '/api/hello',
      auth: '/api/auth',
      clients: '/api/clients',
      payments: '/api/payments'
    }
  });
});

// Tu ruta de prueba actual
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hola desde la API 🚀" });
});

// Aquí irán las rutas de la API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/routines', require('./routes/routines'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/calendar', require('./routes/calendar'));

// 404 handler - DEBE IR PRIMERO
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: `Ruta ${req.originalUrl} no encontrada`,
    message: "Endpoint no existe"
  });
});

// Middleware de manejo de errores - VA AL FINAL
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err.stack);
  
  res.status(err.status || 500).json({ 
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;