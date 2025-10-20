// src/service/googleCalendarService.js

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(__dirname, '../config/token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../config/credentials.json');

let calendar = null;
let auth = null;

// ============================================
// AUTORIZAR CON GOOGLE
// ============================================
const authorize = async () => {
  try {
    const content = fs.readFileSync(CREDENTIALS_PATH);
    const credentials = JSON.parse(content);
    const { client_secret, client_id, redirect_uris } = credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    // Si ya tenemos token, usarlo
    if (fs.existsSync(TOKEN_PATH)) {
      const token = fs.readFileSync(TOKEN_PATH);
      oAuth2Client.setCredentials(JSON.parse(token));
      auth = oAuth2Client;
      calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
      console.log('✅ Google Calendar autenticado con token existente');
      return oAuth2Client;
    }

    // Si no tenemos token, generar URL para autorizar
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    console.log('⚠️  NECESITAS AUTORIZAR. Abre esta URL:');
    console.log(authUrl);
    console.log('\nDespués de autorizar, te dará un código. Pégalo aquí.');

    throw new Error('NO_TOKEN - Necesita autorización inicial');
  } catch (error) {
    console.error('❌ Error autenticando:', error.message);
    throw error;
  }
};

// ============================================
// CREAR EVENTO EN GOOGLE CALENDAR
// ============================================
const crearEvento = async (cliente, rutina, dia) => {
  if (!calendar) {
    throw new Error('Google Calendar no autenticado');
  }

  try {
    // Calcular próxima fecha del día
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const hoy = new Date();
    
    let diasAdelante = dias.indexOf(dia) - hoy.getDay();
    if (diasAdelante <= 0) diasAdelante += 7;
    
    const fechaEvento = new Date(hoy);
    fechaEvento.setDate(fechaEvento.getDate() + diasAdelante);
    fechaEvento.setHours(9, 0, 0, 0); // 9 AM

    const fechaFin = new Date(fechaEvento);
    fechaFin.setMinutes(fechaFin.getMinutes() + rutina.duracionEstimada);

    // Construir descripción
    let descripcion = `💪 Rutina de ${cliente.nombre}\n\n`;
    descripcion += `Tipo: ${rutina.tipo}\n`;
    descripcion += `Nivel: ${rutina.nivel}\n\n`;
    descripcion += `📋 Ejercicios:\n`;
    
    rutina.ejercicios?.forEach((ej, index) => {
      descripcion += `${index + 1}. ${ej.nombre} - ${ej.series}x${ej.repeticiones}\n`;
    });

    const event = {
      summary: `${rutina.nombre} - ${cliente.nombre}`,
      description: descripcion,
      start: {
        dateTime: fechaEvento.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      end: {
        dateTime: fechaFin.toISOString(),
        timeZone: 'America/Argentina/Buenos_Aires',
      },
      recurrence: ['RRULE:FREQ=WEEKLY'], // Se repite cada semana
      colorId: '3', // Azul
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    console.log(`✅ Evento creado: ${response.data.summary}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error creando evento:', error.message);
    throw error;
  }
};

// ============================================
// SUBIR TODA UNA RUTINA (TODOS SUS DÍAS)
// ============================================
const subirRutina = async (cliente, rutina) => {
  try {
    console.log(`📤 Subiendo rutina "${rutina.nombre}" para ${cliente.nombre}...`);

    const eventos = [];
    
    for (const dia of rutina.diasSemana) {
      try {
        const evento = await crearEvento(cliente, rutina, dia);
        eventos.push(evento);
        
        // Pequeño delay entre eventos
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`❌ Error en día ${dia}:`, error.message);
      }
    }

    console.log(`✅ ${eventos.length} eventos creados`);
    return {
      success: true,
      rutina: rutina.nombre,
      cliente: cliente.nombre,
      eventosCreados: eventos.length,
      eventos
    };
  } catch (error) {
    console.error('❌ Error subiendo rutina:', error.message);
    throw error;
  }
};

// ============================================
// LISTAR EVENTOS PRÓXIMOS
// ============================================
const listarEventos = async (diasAdelante = 7) => {
  if (!calendar) {
    throw new Error('Google Calendar no autenticado');
  }

  try {
    const ahora = new Date();
    const luego = new Date();
    luego.setDate(luego.getDate() + diasAdelante);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: ahora.toISOString(),
      timeMax: luego.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const eventos = response.data.items || [];
    console.log(`📋 ${eventos.length} eventos encontrados`);
    
    return eventos.map(e => ({
      id: e.id,
      titulo: e.summary,
      inicio: e.start.dateTime || e.start.date,
      fin: e.end.dateTime || e.end.date,
    }));
  } catch (error) {
    console.error('❌ Error listando eventos:', error.message);
    throw error;
  }
};

// ============================================
// INICIALIZAR AUTOMÁTICAMENTE
// ============================================
const initializeCalendar = async () => {
  try {
    console.log('🔄 Inicializando Google Calendar...');
    await authorize();
    console.log('✅ Google Calendar inicializado correctamente');
  } catch (error) {
    console.log('⚠️ Google Calendar no pudo inicializarse:', error.message);
    // No es crítico, se puede inicializar manualmente después
  }
};

// Inicializar automáticamente cuando se importa el módulo
initializeCalendar();

module.exports = {
  authorize,
  crearEvento,
  subirRutina,
  listarEventos,
  isAuthorized: () => calendar !== null,
  initializeCalendar
};