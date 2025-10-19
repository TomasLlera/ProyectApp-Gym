// src/service/notificationService.js

const whatsappService = require('./whatsappService');
const emailService = require('./emailService');

/**
 * Servicio centralizado de notificaciones
 * Maneja: WhatsApp + Email en un solo lugar
 */

// ============================================
// 1. NOTIFICAR NUEVA RUTINA (WhatsApp + Email)
// ============================================
const notificarNuevaRutina = async (cliente, rutina) => {
  if (!cliente) {
    console.log('⚠️ Cliente no válido');
    return null;
  }

  const resultados = {
    whatsapp: null,
    email: null,
    errores: []
  };

  try {
    // Enviar WhatsApp
    if (cliente.telefono) {
      try {
        resultados.whatsapp = await whatsappService.enviarNotificacionRutina(cliente, rutina);
        console.log(`✅ WhatsApp enviado a ${cliente.nombre}`);
      } catch (error) {
        console.error(`❌ Error WhatsApp: ${error.message}`);
        resultados.errores.push(`WhatsApp: ${error.message}`);
      }
    }

    // Enviar Email
    if (cliente.email) {
      try {
        resultados.email = await emailService.enviarEmailRutina(cliente, rutina);
        console.log(`✅ Email enviado a ${cliente.email}`);
      } catch (error) {
        console.error(`❌ Error Email: ${error.message}`);
        resultados.errores.push(`Email: ${error.message}`);
      }
    }

    return resultados;
  } catch (error) {
    console.error('❌ Error en notificación:', error.message);
    return resultados;
  }
};

// ============================================
// 2. NOTIFICAR CAMBIO DE RUTINA
// ============================================
const notificarCambioRutina = async (cliente, rutina, cambios) => {
  if (!cliente.telefono && !cliente.email) {
    console.log(`⚠️ ${cliente.nombre} sin contacto`);
    return null;
  }

  const cambiosText = Object.entries(cambios)
    .map(([key, value]) => `• ${key}: ${value}`)
    .join('\n');

  const mensaje = `Hola ${cliente.nombre}! 👋\n\n` +
                  `Tu rutina *${rutina.nombre}* ha sido actualizada:\n\n` +
                  `${cambiosText}\n\n` +
                  `Revísala en tu app o Google Calendar. ✅`;

  try {
    if (cliente.telefono) {
      await whatsappService.sendWhatsApp(cliente.telefono, mensaje);
    }
    return true;
  } catch (error) {
    console.error('❌ Error notificando cambio:', error.message);
    return false;
  }
};

// ============================================
// 3. RECORDATORIO DIARIO DE RUTINA (7:00 AM)
// ============================================
const recordatorioDiario = async () => {
  try {
    const Routine = require('../models/routines');
    const Client = require('../models/client');

    // Obtener día de hoy en español
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const hoy = new Date();
    const diaHoy = dias[hoy.getDay()];

    console.log(`\n⏰ [${new Date().toLocaleTimeString('es-AR')}] Ejecutando recordatorio diario...`);
    console.log(`📅 Día actual: ${diaHoy}`);

    // Buscar todas las rutinas para hoy
    const rutinas = await Routine.find({
      activa: true,
      diasSemana: diaHoy
    }).populate('cliente');

    if (rutinas.length === 0) {
      console.log('✅ No hay rutinas para hoy');
      return { enviados: 0, errores: 0 };
    }

    console.log(`📋 Rutinas encontradas para hoy: ${rutinas.length}`);

    let enviados = 0;
    let errores = 0;

    for (const rutina of rutinas) {
      const cliente = rutina.cliente;

      // Solo enviar si el cliente está activo
      if (!cliente || !cliente.activo) {
        console.log(`⚠️ Cliente inactivo: ${cliente?.nombre}`);
        continue;
      }

      if (!cliente.telefono) {
        console.log(`⚠️ ${cliente.nombre} sin teléfono`);
        continue;
      }

      try {
        const mensaje = `¡Buenos días ${cliente.nombre}! 🌅\n\n` +
                       `Hoy te toca: *${rutina.nombre}* 💪\n\n` +
                       `⏱️ Duración: ${rutina.duracionEstimada} minutos\n` +
                       `🏋️ ${rutina.ejercicios?.length || 0} ejercicios\n\n` +
                       `¡A darle con todo! 🔥`;

        await whatsappService.sendWhatsApp(cliente.telefono, mensaje);
        console.log(`✅ Recordatorio enviado a ${cliente.nombre}`);
        enviados++;
      } catch (error) {
        console.error(`❌ Error con ${cliente.nombre}: ${error.message}`);
        errores++;
      }
    }

    console.log(`\n📊 Recordatorio finalizado: ${enviados} enviados, ${errores} errores\n`);
    return { enviados, errores, total: rutinas.length };
  } catch (error) {
    console.error('❌ Error en recordatorio diario:', error.message);
    return { enviados: 0, errores: 1 };
  }
};

// ============================================
// 4. NOTIFICAR CAMBIO DE PLAN
// ============================================
const notificarCambioPlan = async (cliente, planAnterior, planNuevo) => {
  if (!cliente.telefono) return null;

  const mensaje = `Hola ${cliente.nombre}! 👋\n\n` +
                  `Tu plan ha sido actualizado:\n\n` +
                  `📍 Anterior: ${planAnterior}\n` +
                  `📍 Nuevo: ${planNuevo}\n\n` +
                  `Si tienes dudas, estamos para ayudarte. ✅`;

  try {
    await whatsappService.sendWhatsApp(cliente.telefono, mensaje);
    return true;
  } catch (error) {
    console.error('❌ Error notificando cambio de plan:', error.message);
    return false;
  }
};

// ============================================
// 5. NOTIFICAR PROMOCIÓN (Masivo)
// ============================================
const notificarPromocion = async (titulo, descripcion, codigoDescuento = null) => {
  try {
    const Client = require('../models/client');

    // Obtener todos los clientes activos con teléfono
    const clientes = await Client.find({
      activo: true,
      telefono: { $exists: true, $ne: '' }
    });

    console.log(`📢 Enviando promoción a ${clientes.length} clientes...`);

    let mensaje = `🎉 ¡${titulo}! 🎉\n\n${descripcion}`;

    if (codigoDescuento) {
      mensaje += `\n\n💰 Código: *${codigoDescuento}*`;
    }

    let enviados = 0;
    let errores = 0;

    for (const cliente of clientes) {
      try {
        await whatsappService.sendWhatsApp(cliente.telefono, mensaje);
        enviados++;
      } catch (error) {
        console.error(`❌ Error con ${cliente.nombre}: ${error.message}`);
        errores++;
      }

      // Pequeño delay para no saturar Twilio
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`📊 Promoción enviada: ${enviados}/${clientes.length}`);
    return { enviados, errores, total: clientes.length };
  } catch (error) {
    console.error('❌ Error en promoción:', error.message);
    throw error;
  }
};

// ============================================
// 6. NOTIFICAR VENCIMIENTO (Ya existente)
// ============================================
const notificarVencimiento = async (cliente, diasRestantes) => {
  if (!cliente.telefono) return null;

  try {
    await whatsappService.enviarRecordatorioVencimiento(cliente, diasRestantes);
    return true;
  } catch (error) {
    console.error('❌ Error notificando vencimiento:', error.message);
    return false;
  }
};

module.exports = {
  notificarNuevaRutina,
  notificarCambioRutina,
  recordatorioDiario,
  notificarCambioPlan,
  notificarPromocion,
  notificarVencimiento
};