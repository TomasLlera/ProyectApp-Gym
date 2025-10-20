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

// ============================================
// Subir rutina con DATOS COMPLETOS (para SQLite frontend)
// ============================================
router.post('/subir-rutina-completa', async (req, res) => {
  try {
    const { nombre, descripcion, tipo, nivel, duracionEstimada, diasSemana, ejercicios, cliente } = req.body;

    console.log('📤 Recibiendo rutina completa desde frontend SQLite:', nombre);

    // Validar datos básicos
    if (!nombre || !cliente || !cliente.nombre) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos obligatorios: nombre y cliente'
      });
    }

    if (!diasSemana || diasSemana.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'La rutina debe tener al menos un día asignado'
      });
    }

    // Crear objeto rutina temporal para Google Calendar
    const rutinaParaCalendar = {
      nombre: nombre,
      descripcion: descripcion || '',
      tipo: tipo || 'personalizada',
      nivel: nivel || 'principiante', 
      duracionEstimada: duracionEstimada || 60,
      diasSemana: diasSemana,
      ejercicios: ejercicios || []
    };

    // Crear objeto cliente temporal
    const clienteParaCalendar = {
      nombre: cliente.nombre,
      telefono: cliente.telefono || '',
      email: cliente.email || ''
    };

    console.log('🔄 Procesando rutina para Google Calendar...');

    // Subir directamente a Google Calendar usando el servicio existente
    const resultado = await googleCalendarService.subirRutina(
      clienteParaCalendar,
      rutinaParaCalendar
    );

    console.log('✅ Rutina subida exitosamente a Google Calendar');

    res.json({
      success: true,
      message: `✅ ${resultado.eventosCreados} eventos creados en Google Calendar`,
      data: {
        rutina: nombre,
        cliente: cliente.nombre,
        eventosCreados: resultado.eventosCreados,
        diasProgramados: diasSemana
      }
    });

  } catch (error) {
    console.error('❌ Error subiendo rutina completa:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;