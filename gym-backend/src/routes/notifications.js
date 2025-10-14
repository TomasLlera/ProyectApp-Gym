// src/routes/notifications.js

const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');

// @route   POST /api/notifications/recordatorios-vencimiento
// @desc    Enviar recordatorios a clientes próximos a vencer
router.post('/recordatorios-vencimiento', notificationsController.enviarRecordatoriosVencimiento);

// @route   POST /api/notifications/notificar-vencidos
// @desc    Enviar notificaciones a clientes vencidos
router.post('/notificar-vencidos', notificationsController.enviarNotificacionesVencidos);

// @route   POST /api/notifications/enviar-mensaje
// @desc    Enviar mensaje individual a un cliente
router.post('/enviar-mensaje', notificationsController.enviarMensajeIndividual);

// @route   POST /api/notifications/bienvenida
// @desc    Enviar mensaje de bienvenida
router.post('/bienvenida', notificationsController.enviarBienvenida);

// 🧪 Ruta de prueba (TEMPORAL)
router.get('/testWhatsapp', async (req, res) => {
  try {
    const whatsappService = require('../service/whatsappService');
    
    console.log('🧪 Probando envío de WhatsApp...');
    
    const resultado = await whatsappService.sendWhatsApp(
      '+5492236353735',
      '¡Hola! 👋 Este es un mensaje de prueba desde el sistema del gym. Si lo recibís, todo funciona perfecto! ✅🏋️'
    );
    
    res.json({ 
      success: true, 
      message: '✅ Mensaje enviado',
      sid: resultado.sid,
      status: resultado.status
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      code: error.code
    });
  }
});

module.exports = router;