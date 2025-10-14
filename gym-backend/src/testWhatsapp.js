require('dotenv').config();
const whatsappService = require('./service/whatsappService');

async function testWhatsApp() {
  try {
    console.log('🔧 Verificando configuración...');
    console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID ? '✓' : '✗');
    console.log('Auth Token:', process.env.TWILIO_AUTH_TOKEN ? '✓' : '✗');
    console.log('From Number:', process.env.TWILIO_WHATSAPP_FROM);
    console.log('');
    
    console.log('📱 Enviando mensaje de prueba...');
    
    const resultado = await whatsappService.sendWhatsApp(
      '+5492236353735', // Tu número
      '¡Hola! Este es un mensaje de prueba desde el sistema del gym 🏋️\n\nSi recibís este mensaje, ¡todo funciona perfecto! ✅'
    );
    
    console.log('');
    console.log('✅ ¡Mensaje enviado exitosamente!');
    console.log('SID del mensaje:', resultado.sid);
    console.log('Estado:', resultado.status);
    console.log('');
    console.log('👀 Revisá tu WhatsApp en unos segundos...');
  } catch (error) {
    console.error('');
    console.error('❌ Error al enviar mensaje:');
    console.error('Mensaje:', error.message);
    if (error.code) {
      console.error('Código Twilio:', error.code);
    }
    if (error.moreInfo) {
      console.error('Más info:', error.moreInfo);
    }
  }
}

testWhatsApp();