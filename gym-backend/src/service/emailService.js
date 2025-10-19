// src/service/emailService.js

const nodemailer = require('nodemailer');

// Configurar transporte de email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ============================================
// ENVIAR EMAIL DE RUTINA ASIGNADA
// ============================================
const enviarEmailRutina = async (cliente, rutina) => {
  try {
    if (!cliente.email) {
      console.log(`⚠️ ${cliente.nombre} sin email`);
      return null;
    }

    // Construir tabla de ejercicios en HTML
    let ejerciciosHTML = '';
    rutina.ejercicios?.forEach((ej, index) => {
      ejerciciosHTML += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${index + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${ej.nombre}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${ej.series}x${ej.repeticiones}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${ej.peso}</td>
        </tr>
      `;
    });

    const diasSemana = rutina.diasSemana?.join(', ') || 'A definir';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .section { margin: 20px 0; }
            .section h2 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th { background: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; }
            .btn { display: inline-block; background: #667eea; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 10px 0; }
            .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💪 Nueva Rutina Asignada</h1>
            </div>
            
            <div class="content">
              <p>Hola <strong>${cliente.nombre}</strong>,</p>
              
              <p>Te hemos asignado una nueva rutina de entrenamiento. Todos los detalles están disponibles en tu Google Calendar.</p>
              
              <div class="section">
                <h2>📋 Información de la Rutina</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px;"><strong>Nombre:</strong></td>
                    <td style="padding: 8px;">${rutina.nombre}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px;"><strong>Tipo:</strong></td>
                    <td style="padding: 8px;">${rutina.tipo}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px;"><strong>Nivel:</strong></td>
                    <td style="padding: 8px;">${rutina.nivel}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px;"><strong>Días:</strong></td>
                    <td style="padding: 8px;">${diasSemana}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px;"><strong>Duración:</strong></td>
                    <td style="padding: 8px;">${rutina.duracionEstimada} minutos</td>
                  </tr>
                </table>
              </div>

              <div class="section">
                <h2>🏋️ Ejercicios</h2>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Ejercicio</th>
                      <th>Series x Reps</th>
                      <th>Peso</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${ejerciciosHTML}
                  </tbody>
                </table>
              </div>

              <div class="section">
                <h2>📅 Google Calendar</h2>
                <p>La rutina ya está agregada a tu Google Calendar. Verás los eventos en tu calendario de Gmail cada día que debas entrenar.</p>
                <p><a href="https://calendar.google.com" class="btn">Abrir Google Calendar</a></p>
              </div>

              <div class="section">
                <p style="background: #fffacd; padding: 10px; border-left: 4px solid #ffc107;">
                  <strong>💡 Tip:</strong> Si aún no ves los eventos, recarga tu página o espera unos minutos.
                </p>
              </div>

              <p>¡Vamos a darle con todo! Si tienes dudas, contáctanos.</p>
              <p>Saludos,<br><strong>Tu Entrenador</strong></p>
            </div>

            <div class="footer">
              <p>Este es un email automático. No respondas a este correo.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: cliente.email,
      subject: `🏋️ Nueva Rutina: ${rutina.nombre}`,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado a ${cliente.email}`);
    return result;
  } catch (error) {
    console.error('❌ Error enviando email:', error.message);
    throw error;
  }
};

// ============================================
// ENVIAR EMAIL DE RESUMEN (múltiples rutinas)
// ============================================
const enviarEmailResumenRutinas = async (cliente, rutinas) => {
  try {
    if (!cliente.email) {
      console.log(`⚠️ ${cliente.nombre} sin email`);
      return null;
    }

    let rutinasHTML = '';
    rutinas.forEach((r, index) => {
      rutinasHTML += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${index + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${r.nombre}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${r.tipo}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${r.diasSemana?.join(', ')}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .section { margin: 20px 0; }
            .section h2 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th { background: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; }
            .btn { display: inline-block; background: #667eea; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; }
            .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💪 ${rutinas.length} Nuevas Rutinas Asignadas</h1>
            </div>
            
            <div class="content">
              <p>Hola <strong>${cliente.nombre}</strong>,</p>
              <p>Te hemos asignado ${rutinas.length} nueva${rutinas.length > 1 ? 's' : ''} rutina${rutinas.length > 1 ? 's' : ''} de entrenamiento.</p>
              
              <div class="section">
                <h2>📋 Tus Rutinas</h2>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Tipo</th>
                      <th>Días</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rutinasHTML}
                  </tbody>
                </table>
              </div>

              <div class="section">
                <h2>📅 Google Calendar</h2>
                <p>Todas tus rutinas ya están agregadas a tu Google Calendar. Verás los eventos cada día que debas entrenar.</p>
                <p><a href="https://calendar.google.com" class="btn">Abrir Google Calendar</a></p>
              </div>

              <p>¡Vamos a darle con todo! Si tienes dudas, contáctanos.</p>
              <p>Saludos,<br><strong>Tu Entrenador</strong></p>
            </div>

            <div class="footer">
              <p>Este es un email automático. No respondas a este correo.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: cliente.email,
      subject: `🏋️ ${rutinas.length} Nuevas Rutinas Asignadas`,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email de resumen enviado a ${cliente.email}`);
    return result;
  } catch (error) {
    console.error('❌ Error enviando email:', error.message);
    throw error;
  }
};

module.exports = {
  enviarEmailRutina,
  enviarEmailResumenRutinas
};