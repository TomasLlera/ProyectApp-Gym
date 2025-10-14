// src/services/whatsappService.js

const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

let client;

// Inicializar cliente de Twilio
const initTwilio = () => {
  if (!accountSid || !authToken) {
    console.warn('⚠️  Twilio no configurado. Verifica las variables de entorno.');
    return null;
  }
  
  if (!client) {
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio WhatsApp inicializado');
  }
  
  return client;
};

/* ============================================
   📱 Enviar mensaje de WhatsApp
============================================ */
const sendWhatsApp = async (to, message) => {
  const twilioClient = initTwilio();
  
  if (!twilioClient) {
    throw new Error('Twilio no está configurado');
  }

  try {
    // Formatear número (debe incluir código de país)
    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    
    console.log(`📤 Enviando WhatsApp a ${toNumber}`);
    
    const result = await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: toNumber
    });

    console.log(`✅ WhatsApp enviado. SID: ${result.sid}`);
    return result;
  } catch (error) {
    console.error('❌ Error enviando WhatsApp:', error.message);
    throw error;
  }
};

/* ============================================
   ⏰ Recordatorio de vencimiento
============================================ */
const enviarRecordatorioVencimiento = async (cliente, diasRestantes) => {
  const nombre = cliente.nombre;
  const monto = cliente.montoMensual;
  const telefono = cliente.telefono;

  if (!telefono) {
    console.log(`⚠️  Cliente ${nombre} no tiene teléfono`);
    return null;
  }

  let mensaje;

  if (diasRestantes > 0) {
    // Antes del vencimiento
    mensaje = `Hola ${nombre}! 👋\n\n` +
              `Te recordamos que tu cuota del gimnasio vence en *${diasRestantes} día${diasRestantes > 1 ? 's' : ''}*.\n\n` +
              `💰 Monto: $${monto}\n\n` +
              `¡Esperamos verte pronto en el gym! 🏋️`;
  } else if (diasRestantes === 0) {
    // Día del vencimiento
    mensaje = `Hola ${nombre}! 👋\n\n` +
              `Tu cuota del gimnasio *vence HOY*.\n\n` +
              `💰 Monto: $${monto}\n\n` +
              `¡No te olvides de renovarla! 🏋️`;
  } else {
    // Vencido
    const diasVencido = Math.abs(diasRestantes);
    mensaje = `Hola ${nombre}! 👋\n\n` +
              `Tu cuota del gimnasio está *vencida hace ${diasVencido} día${diasVencido > 1 ? 's' : ''}*.\n\n` +
              `💰 Monto: $${monto}\n\n` +
              `Por favor, acercate a renovarla lo antes posible. ¡Te esperamos! 🏋️`;
  }

  return await sendWhatsApp(telefono, mensaje);
};

/* ============================================
   🎉 Bienvenida a nuevo cliente
============================================ */
const enviarBienvenida = async (cliente) => {
  const { nombre, telefono, diasSemana } = cliente;

  if (!telefono) return null;

  const mensaje = `¡Bienvenido/a al gym, ${nombre}! 🎉\n\n` +
                  `Estamos felices de tenerte con nosotros.\n\n` +
                  `Recordá tus días de entrenamiento y ¡a darle con todo! 💪\n\n` +
                  `Cualquier duda, estamos para ayudarte. 🏋️`;

  return await sendWhatsApp(telefono, mensaje);
};

/* ============================================
   📋 Nueva rutina asignada
============================================ */
const enviarNotificacionRutina = async (cliente, rutina) => {
  const { nombre, telefono } = cliente;

  if (!telefono) return null;

  const dias = rutina.diasSemana?.join(', ') || 'a definir';

  const mensaje = `Hola ${nombre}! 👋\n\n` +
                  `Te asignamos una nueva rutina: *${rutina.nombre}*\n\n` +
                  `📅 Días: ${dias}\n` +
                  `⏱️ Duración: ${rutina.duracionEstimada} min\n` +
                  `💪 ${rutina.ejercicios?.length || 0} ejercicios\n\n` +
                  `¡Vamos con todo! 🏋️`;

  return await sendWhatsApp(telefono, mensaje);
};

module.exports = {
  sendWhatsApp,
  enviarRecordatorioVencimiento,
  enviarBienvenida,
  enviarNotificacionRutina
};