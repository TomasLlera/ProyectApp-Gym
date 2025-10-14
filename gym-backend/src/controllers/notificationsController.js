// src/controllers/notificationsController.js

const Client = require('../models/client');
const whatsappService = require('../service/whatsappService');

/* ============================================
   📤 Enviar recordatorios a clientes próximos a vencer
============================================ */
exports.enviarRecordatoriosVencimiento = async (req, res) => {
  try {
    const { diasAntes = 3 } = req.query; // Por defecto, 3 días antes
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(fechaLimite.getDate() + parseInt(diasAntes));

    // Buscar clientes que vencen pronto
    const clientes = await Client.find({
      activo: true,
      estadoPago: { $in: ['pagado', 'pendiente'] },
      fechaVencimiento: {
        $gte: hoy,
        $lte: fechaLimite
      },
      telefono: { $exists: true, $ne: '' }
    });

    console.log(`📱 Enviando recordatorios a ${clientes.length} cliente(s)...`);

    const resultados = [];
    for (const cliente of clientes) {
      const diasRestantes = Math.ceil(
        (new Date(cliente.fechaVencimiento) - hoy) / (1000 * 60 * 60 * 24)
      );

      try {
        await whatsappService.enviarRecordatorioVencimiento(cliente, diasRestantes);
        resultados.push({
          cliente: `${cliente.nombre} ${cliente.apellido}`,
          telefono: cliente.telefono,
          diasRestantes,
          estado: 'enviado'
        });
      } catch (error) {
        resultados.push({
          cliente: `${cliente.nombre} ${cliente.apellido}`,
          telefono: cliente.telefono,
          diasRestantes,
          estado: 'error',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `${resultados.filter(r => r.estado === 'enviado').length} mensajes enviados`,
      data: resultados
    });
  } catch (error) {
    console.error('Error enviando recordatorios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar recordatorios'
    });
  }
};

/* ============================================
   ⚠️ Enviar notificaciones a clientes vencidos
============================================ */
exports.enviarNotificacionesVencidos = async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Buscar clientes vencidos
    const clientes = await Client.find({
      activo: true,
      estadoPago: 'vencido',
      fechaVencimiento: { $lt: hoy },
      telefono: { $exists: true, $ne: '' }
    });

    console.log(`⚠️  Enviando notificaciones a ${clientes.length} cliente(s) vencido(s)...`);

    const resultados = [];
    for (const cliente of clientes) {
      const diasVencido = Math.floor(
        (hoy - new Date(cliente.fechaVencimiento)) / (1000 * 60 * 60 * 24)
      );

      try {
        await whatsappService.enviarRecordatorioVencimiento(cliente, -diasVencido);
        resultados.push({
          cliente: `${cliente.nombre} ${cliente.apellido}`,
          telefono: cliente.telefono,
          diasVencido,
          estado: 'enviado'
        });
      } catch (error) {
        resultados.push({
          cliente: `${cliente.nombre} ${cliente.apellido}`,
          telefono: cliente.telefono,
          diasVencido,
          estado: 'error',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `${resultados.filter(r => r.estado === 'enviado').length} mensajes enviados`,
      data: resultados
    });
  } catch (error) {
    console.error('Error enviando notificaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar notificaciones'
    });
  }
};

/* ============================================
   📱 Enviar mensaje individual
============================================ */
exports.enviarMensajeIndividual = async (req, res) => {
  try {
    const { clienteId, mensaje } = req.body;

    if (!clienteId || !mensaje) {
      return res.status(400).json({
        success: false,
        error: 'Cliente y mensaje son requeridos'
      });
    }

    const cliente = await Client.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    if (!cliente.telefono) {
      return res.status(400).json({
        success: false,
        error: 'El cliente no tiene teléfono registrado'
      });
    }

    await whatsappService.sendWhatsApp(cliente.telefono, mensaje);

    res.json({
      success: true,
      message: 'Mensaje enviado exitosamente'
    });
  } catch (error) {
    console.error('Error enviando mensaje:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al enviar mensaje'
    });
  }
};

/* ============================================
   🎉 Enviar bienvenida
============================================ */
exports.enviarBienvenida = async (req, res) => {
  try {
    const { clienteId } = req.body;

    const cliente = await Client.findById(clienteId);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    await whatsappService.enviarBienvenida(cliente);

    res.json({
      success: true,
      message: 'Mensaje de bienvenida enviado'
    });
  } catch (error) {
    console.error('Error enviando bienvenida:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar bienvenida'
    });
  }
};