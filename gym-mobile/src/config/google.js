// src/config/google.js
export const GOOGLE_CONFIG = {
  CLIENT_ID: '68308825225-5p5cco7ojf7hem7f48p1haedgn5g23vl.apps.googleusercontent.com',
  CLIENT_SECRET: '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', // Solo para referencia, no se usa en frontend
  SCOPES: ['https://www.googleapis.com/auth/calendar'],
  REDIRECT_URI_SCHEME: 'gym-mobile' // Coincide con el scheme en app.json
};

// Instrucciones para obtener Google Client ID:
// 1. Ve a https://console.cloud.google.com/
// 2. Crea un nuevo proyecto o selecciona uno existente
// 3. Habilita la API de Google Calendar
// 4. Ve a "Credenciales" > "Crear credenciales" > "ID de cliente OAuth 2.0"
// 5. Selecciona "Aplicación de escritorio" o "Aplicación móvil"
// 6. Copia el Client ID aquí