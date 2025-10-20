// src/services/googleCalendarService.js
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { GOOGLE_CONFIG } from '../config/google';

WebBrowser.maybeCompleteAuthSession();

// Configuración de Google OAuth
const { CLIENT_ID, SCOPES, REDIRECT_URI_SCHEME } = GOOGLE_CONFIG;

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

class GoogleCalendarService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  async initialize() {
    try {
      // Intentar recuperar tokens guardados
      const accessToken = await SecureStore.getItemAsync('google_access_token');
      const refreshToken = await SecureStore.getItemAsync('google_refresh_token');
      
      if (accessToken && refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        console.log('✅ Tokens de Google Calendar recuperados');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error inicializando Google Calendar:', error);
      return false;
    }
  }

  async authenticate() {
    try {
      console.log('🔐 Iniciando autenticación con Google...');

      const request = new AuthSession.AuthRequest({
        clientId: CLIENT_ID,
        scopes: SCOPES,
        responseType: AuthSession.ResponseType.Code,
        redirectUri: AuthSession.makeRedirectUri({
          scheme: REDIRECT_URI_SCHEME
        }),
      });

      const result = await request.promptAsync(discovery);

      if (result.type === 'success') {
        console.log('✅ Código de autorización obtenido');
        
        // Intercambiar código por tokens
        const tokenResult = await AuthSession.exchangeCodeAsync({
          clientId: CLIENT_ID,
          code: result.params.code,
          redirectUri: AuthSession.makeRedirectUri({
            scheme: REDIRECT_URI_SCHEME
          }),
        }, discovery);

        if (tokenResult.accessToken) {
          this.accessToken = tokenResult.accessToken;
          this.refreshToken = tokenResult.refreshToken;

          // Guardar tokens de forma segura
          await SecureStore.setItemAsync('google_access_token', tokenResult.accessToken);
          if (tokenResult.refreshToken) {
            await SecureStore.setItemAsync('google_refresh_token', tokenResult.refreshToken);
          }

          console.log('✅ Autenticación completada y tokens guardados');
          return true;
        }
      }

      console.log('❌ Autenticación cancelada o falló');
      return false;
    } catch (error) {
      console.error('Error en autenticación:', error);
      throw error;
    }
  }

  async refreshAccessToken() {
    try {
      if (!this.refreshToken) {
        throw new Error('No hay refresh token disponible');
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=refresh_token&refresh_token=${this.refreshToken}&client_id=${CLIENT_ID}`,
      });

      const data = await response.json();

      if (data.access_token) {
        this.accessToken = data.access_token;
        await SecureStore.setItemAsync('google_access_token', data.access_token);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error refrescando token:', error);
      return false;
    }
  }

  async createEvent(eventData) {
    try {
      if (!this.accessToken) {
        throw new Error('No hay token de acceso. Debes autenticarte primero.');
      }

      console.log('📅 Creando evento en Google Calendar...');

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        }
      );

      if (response.status === 401) {
        console.log('🔄 Token expirado, intentando refrescar...');
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Reintentar con nuevo token
          return this.createEvent(eventData);
        } else {
          throw new Error('Token expirado y no se pudo refrescar');
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error de Google Calendar: ${errorData.error?.message || 'Error desconocido'}`);
      }

      const event = await response.json();
      console.log('✅ Evento creado:', event.summary);
      return event;
    } catch (error) {
      console.error('Error creando evento:', error);
      throw error;
    }
  }

  async createRoutineEvents(routine) {
    try {
      console.log(`📤 Creando eventos para rutina: ${routine.nombre}`);
      
      if (!routine.diasSemana || routine.diasSemana.length === 0) {
        throw new Error('La rutina debe tener al menos un día asignado');
      }

      const eventos = [];
      const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

      for (const dia of routine.diasSemana) {
        try {
          // Calcular próxima fecha del día
          const hoy = new Date();
          let diasAdelante = diasSemana.indexOf(dia.toLowerCase()) - hoy.getDay();
          if (diasAdelante <= 0) diasAdelante += 7;

          const fechaEvento = new Date(hoy);
          fechaEvento.setDate(fechaEvento.getDate() + diasAdelante);
          fechaEvento.setHours(9, 0, 0, 0); // 9 AM por defecto

          const fechaFin = new Date(fechaEvento);
          fechaFin.setMinutes(fechaFin.getMinutes() + (routine.duracionEstimada || 60));

          // Construir descripción
          let descripcion = `💪 Rutina de ${routine.clienteNombre}\n\n`;
          descripcion += `Tipo: ${routine.tipo || 'Personalizada'}\n`;
          descripcion += `Nivel: ${routine.nivel || 'Principiante'}\n\n`;
          
          if (routine.descripcion) {
            descripcion += `📝 Descripción: ${routine.descripcion}\n\n`;
          }
          
          descripcion += `📋 Ejercicios:\n`;
          routine.ejercicios?.forEach((ej, index) => {
            descripcion += `${index + 1}. ${ej.nombre}`;
            if (ej.series && ej.repeticiones) {
              descripcion += ` - ${ej.series}x${ej.repeticiones}`;
            }
            descripcion += '\n';
          });

          const eventData = {
            summary: `${routine.nombre} - ${routine.clienteNombre}`,
            description: descripcion,
            start: {
              dateTime: fechaEvento.toISOString(),
              timeZone: 'America/Argentina/Buenos_Aires',
            },
            end: {
              dateTime: fechaFin.toISOString(),
              timeZone: 'America/Argentina/Buenos_Aires',
            },
            recurrence: ['RRULE:FREQ=WEEKLY;COUNT=12'], // Se repite 12 semanas
            colorId: '3', // Azul
          };

          const evento = await this.createEvent(eventData);
          eventos.push(evento);

          // Pequeño delay entre eventos
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`❌ Error creando evento para ${dia}:`, error);
        }
      }

      console.log(`✅ ${eventos.length} eventos creados para ${routine.nombre}`);
      return {
        success: true,
        eventosCreados: eventos.length,
        eventos
      };
    } catch (error) {
      console.error('Error creando eventos de rutina:', error);
      throw error;
    }
  }

  async logout() {
    try {
      this.accessToken = null;
      this.refreshToken = null;
      await SecureStore.deleteItemAsync('google_access_token');
      await SecureStore.deleteItemAsync('google_refresh_token');
      console.log('✅ Sesión de Google Calendar cerrada');
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  }

  isAuthenticated() {
    return !!this.accessToken;
  }
}

export default new GoogleCalendarService();