// src/routes/calendar.js - VERSIÓN COMPLETA CON EMAILS ✅📧

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Routine = require('../models/routines');
const Client = require('../models/client');
const googleCalendarService = require('../service/googleCalendarService');
const emailService = require('../service/emailService');
const whatsappService = require('../service/whatsappService');

// Aplicar autenticación a todas las rutas
router.use(auth);

// ============================================
// 1. SUBIR UNA RUTINA (desde MongoDB)
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

    if (!routine.cliente) {
      return res.status(400).json({
        success: false,
        error: 'La rutina no tiene cliente asignado'
      });
    }

    console.log(`📤 Subiendo rutina "${routine.nombre}" para ${routine.cliente.nombre}...`);

    // Subir a Google Calendar
    const resultado = await googleCalendarService.subirRutina(
      routine.cliente,
      routine
    );

    // 📧 ENVIAR EMAIL con detalles de la rutina
    try {
      if (routine.cliente.email) {
        await emailService.enviarEmailRutina(routine.cliente, routine);
        console.log('📧 Email enviado exitosamente');
      }
    } catch (emailError) {
      console.warn('⚠️  Error enviando email:', emailError.message);
    }

    // 📱 ENVIAR WHATSAPP (opcional)
    try {
      if (routine.cliente.telefono) {
        await whatsappService.enviarNotificacionRutina(routine.cliente, routine);
        console.log('📱 WhatsApp enviado exitosamente');
      }
    } catch (whatsappError) {
      console.warn('⚠️  Error enviando WhatsApp:', whatsappError.message);
    }

    res.json({
      success: true,
      message: `✅ ${resultado.eventosCreados} eventos creados en Google Calendar`,
      data: resultado
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 2. SUBIR TODAS LAS RUTINAS DE UN CLIENTE
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

    // Obtener todas las rutinas activas del cliente
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

    console.log(`📤 Subiendo ${routines.length} rutinas para ${cliente.nombre}...`);

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
        console.error(`❌ Error con rutina ${routine.nombre}:`, error.message);
        resultados.push({
          rutina: routine.nombre,
          error: error.message,
          estado: '❌'
        });
      }
    }

    // 📧 ENVIAR EMAIL RESUMEN con todas las rutinas
    try {
      if (cliente.email && routines.length > 0) {
        await emailService.enviarEmailResumenRutinas(cliente, routines);
        console.log('📧 Email resumen enviado exitosamente');
      }
    } catch (emailError) {
      console.warn('⚠️  Error enviando email resumen:', emailError.message);
    }

    res.json({
      success: true,
      cliente: cliente.nombre,
      totalRutinas: routines.length,
      totalEventos,
      detalles: resultados
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 3. 🆕 SUBIR RUTINA COMPLETA (desde SQLite Frontend)
// ============================================
router.post('/subir-rutina-completa', async (req, res) => {
  try {
    const { nombre, descripcion, tipo, nivel, duracionEstimada, diasSemana, ejercicios, cliente } = req.body;

    console.log('📤 Recibiendo rutina completa desde SQLite frontend:', nombre);

    // Validaciones
    if (!nombre || !cliente || !cliente.nombre) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos obligatorios: nombre y cliente.nombre'
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
      tipo: tipo || 'personalizado',
      nivel: nivel || 'principiante',
      duracionEstimada: duracionEstimada || 60,
      diasSemana: diasSemana,
      ejercicios: ejercicios || []
    };

    // Crear objeto cliente temporal
    const clienteParaCalendar = {
      nombre: cliente.nombre,
      apellido: cliente.apellido || '',
      telefono: cliente.telefono || '',
      email: cliente.email || ''
    };

    console.log('📄 Procesando rutina para Google Calendar...');
    console.log(`   Cliente: ${clienteParaCalendar.nombre} ${clienteParaCalendar.apellido}`);
    console.log(`   Días: ${diasSemana.join(', ')}`);
    console.log(`   Ejercicios: ${ejercicios?.length || 0}`);

    // 1️⃣ Subir a Google Calendar
    const resultado = await googleCalendarService.subirRutina(
      clienteParaCalendar,
      rutinaParaCalendar
    );

    console.log('✅ Rutina subida exitosamente a Google Calendar');

    // 2️⃣ 📧 ENVIAR EMAIL con detalles de la rutina
    let emailEnviado = false;
    try {
      if (clienteParaCalendar.email) {
        await emailService.enviarEmailRutina(clienteParaCalendar, rutinaParaCalendar);
        console.log('📧 Email enviado exitosamente a:', clienteParaCalendar.email);
        emailEnviado = true;
      } else {
        console.log('⚠️  Cliente sin email, omitiendo envío');
      }
    } catch (emailError) {
      console.warn('⚠️  Error enviando email:', emailError.message);
    }

    // 3️⃣ 📱 ENVIAR WHATSAPP (opcional)
    let whatsappEnviado = false;
    try {
      if (clienteParaCalendar.telefono) {
        await whatsappService.enviarNotificacionRutina(clienteParaCalendar, rutinaParaCalendar);
        console.log('📱 WhatsApp enviado exitosamente a:', clienteParaCalendar.telefono);
        whatsappEnviado = true;
      } else {
        console.log('⚠️  Cliente sin teléfono, omitiendo WhatsApp');
      }
    } catch (whatsappError) {
      console.warn('⚠️  Error enviando WhatsApp:', whatsappError.message);
    }

    res.json({
      success: true,
      message: `✅ ${resultado.eventosCreados} eventos creados en Google Calendar`,
      data: {
        rutina: nombre,
        cliente: `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
        eventosCreados: resultado.eventosCreados,
        diasProgramados: diasSemana,
        notificaciones: {
          email: emailEnviado ? 'Enviado' : 'No enviado',
          whatsapp: whatsappEnviado ? 'Enviado' : 'No enviado'
        }
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

// ============================================
// 4. 🆕 SUBIR GRUPO COMPLETO (desde SQLite Frontend)
// ============================================
router.post('/subir-grupo-completo', async (req, res) => {
  try {
    const { nombre, descripcion, tipo, nivel, duracionEstimada, diasSemana, ejercicios, clientes, cantidad } = req.body;
    
    console.log(`📤 Subiendo grupo completo: "${nombre}"`);
    console.log(`   Clientes: ${clientes?.length || cantidad || 0}`);

    // Validaciones
    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la rutina es obligatorio'
      });
    }

    if (!clientes || clientes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El grupo debe tener al menos un cliente'
      });
    }

    if (!diasSemana || diasSemana.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'La rutina debe tener al menos un día asignado'
      });
    }

    let totalEventos = 0;
    const resultados = [];
    
    // Crear rutina para cada cliente del grupo
    for (const cliente of clientes) {
      try {
        // Validar que el cliente tenga los datos mínimos
        if (!cliente.nombre) {
          console.warn('⚠️  Cliente sin nombre, saltando...');
          continue;
        }

        const rutinaParaCalendar = {
          nombre,
          descripcion: descripcion || '',
          tipo: tipo || 'personalizado',
          nivel: nivel || 'principiante',
          duracionEstimada: duracionEstimada || 60,
          diasSemana,
          ejercicios: ejercicios || []
        };

        const clienteParaCalendar = {
          nombre: cliente.nombre,
          apellido: cliente.apellido || '',
          telefono: cliente.telefono || '',
          email: cliente.email || ''
        };

        console.log(`\n   📝 Procesando: ${clienteParaCalendar.nombre} ${clienteParaCalendar.apellido}`);
        
        // 1️⃣ Subir a Google Calendar
        const resultado = await googleCalendarService.subirRutina(
          clienteParaCalendar,
          rutinaParaCalendar
        );
        
        totalEventos += resultado.eventosCreados;
        console.log(`   ✅ ${resultado.eventosCreados} eventos creados`);

        // 2️⃣ 📧 ENVIAR EMAIL individual
        let emailEnviado = false;
        try {
          if (clienteParaCalendar.email) {
            await emailService.enviarEmailRutina(clienteParaCalendar, rutinaParaCalendar);
            console.log(`   📧 Email enviado a: ${clienteParaCalendar.email}`);
            emailEnviado = true;
          }
        } catch (emailError) {
          console.warn(`   ⚠️  Error enviando email:`, emailError.message);
        }

        // 3️⃣ 📱 ENVIAR WHATSAPP individual
        let whatsappEnviado = false;
        try {
          if (clienteParaCalendar.telefono) {
            await whatsappService.enviarNotificacionRutina(clienteParaCalendar, rutinaParaCalendar);
            console.log(`   📱 WhatsApp enviado a: ${clienteParaCalendar.telefono}`);
            whatsappEnviado = true;
          }
        } catch (whatsappError) {
          console.warn(`   ⚠️  Error enviando WhatsApp:`, whatsappError.message);
        }

        resultados.push({
          cliente: `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
          eventos: resultado.eventosCreados,
          email: emailEnviado ? 'Enviado' : 'No enviado',
          whatsapp: whatsappEnviado ? 'Enviado' : 'No enviado',
          estado: '✅'
        });
        
        // Delay entre clientes para no saturar APIs
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`   ❌ Error con ${cliente.nombre}:`, error.message);
        resultados.push({
          cliente: `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
          error: error.message,
          email: 'No enviado',
          whatsapp: 'No enviado',
          estado: '❌'
        });
      }
    }

    console.log(`\n✅ Grupo procesado: ${totalEventos} eventos totales\n`);
    
    res.json({
      success: true,
      message: `${totalEventos} eventos creados para ${clientes.length} clientes`,
      totalEventos,
      totalClientes: clientes.length,
      detalles: resultados
    });
  } catch (error) {
    console.error('❌ Error subiendo grupo completo:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 5. VER EVENTOS PRÓXIMOS
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
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// 6. VERIFICAR ESTADO DE AUTORIZACIÓN
// ============================================
router.get('/status', (req, res) => {
  const isAuth = googleCalendarService.isAuthorized();
  
  res.json({
    success: true,
    autorizado: isAuth,
    mensaje: isAuth 
      ? '✅ Google Calendar está conectado' 
      : '❌ Necesita autorización'
  });
});

module.exports = router;