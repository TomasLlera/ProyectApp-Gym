// src/routes/calendar.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Routine = require('../models/routines');
const Client = require('../models/client');
const googleCalendarService = require('../service/googleCalendarService');

// Aplicar autenticación
router.use(auth);

// ============================================
// Subir UNA rutina a Google Calendar
// ============================================
router.post('/subir-rutina/:routineId', async (req, res) => {
  try {
    const { routineId } = req.params;

    const routine = await Routine.findById(routineId).populate('cliente');
    
    if (!routine) {
      return res.status(404).json({
        success: false,
        error: 'Rutina no encontrada'
      });
    }

    if (!routine.cliente.telefono) {
      return res.status(400).json({
        success: false,
        error: 'Cliente sin teléfono registrado'
      });
    }

    // Subir a Google Calendar
    const resultado = await googleCalendarService.subirRutina(
      routine.cliente,
      routine
    );

    res.json({
      success: true,
      message: `✅ ${resultado.eventosCreados} eventos creados en Google Calendar`,
      data: resultado
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Subir TODAS las rutinas de un cliente
// ============================================
router.post('/subir-todas/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;

    const cliente = await Client.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    // Obtener todas las rutinas activas
    const routines = await Routine.find({
      cliente: clienteId,
      activa: true
    });

    if (routines.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El cliente no tiene rutinas activas'
      });
    }

    console.log(`📤 Subiendo ${routines.length} rutinas...`);

    let totalEventos = 0;
    const resultados = [];

    for (const routine of routines) {
      try {
        const resultado = await googleCalendarService.subirRutina(cliente, routine);
        totalEventos += resultado.eventosCreados;
        resultados.push({
          rutina: routine.nombre,
          eventos: resultado.eventosCreados,
          estado: '✅'
        });
      } catch (error) {
        resultados.push({
          rutina: routine.nombre,
          error: error.message,
          estado: '❌'
        });
      }
    }

    res.json({
      success: true,
      cliente: cliente.nombre,
      totalRutinas: routines.length,
      totalEventos,
      detalles: resultados
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Ver eventos próximos
// ============================================
router.get('/eventos', async (req, res) => {
  try {
    const { dias = 7 } = req.query;

    const eventos = await googleCalendarService.listarEventos(parseInt(dias));

    res.json({
      success: true,
      total: eventos.length,
      dias: parseInt(dias),
      eventos
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Verificar si está autorizado
// ============================================
router.get('/status', (req, res) => {
  const isAuth = googleCalendarService.isAuthorized();
  
  res.json({
    success: true,
    autorizado: isAuth,
    mensaje: isAuth 
      ? '✅ Google Calendar está conectado' 
      : '❌ Necesita autorizar'
  });
});

module.exports = router;