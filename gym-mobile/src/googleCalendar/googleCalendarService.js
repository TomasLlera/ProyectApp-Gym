// src/services/googleCalendarService.js
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { GOOGLE_CONFIG } from '../config/google';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const { CLIENT_ID, SCOPES, REDIRECT_URI } = GOOGLE_CONFIG;

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

class GoogleCalendarService {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expirationTime = null;
  }

  async authenticate() {
    try {
      console.log('🔐 Iniciando autenticación con Google...');
      console.log('📱 Platform:', Platform.OS);
      console.log('🔗 Redirect URI:', REDIRECT_URI);
      console.log('🆔 Client ID:', CLIENT_ID);

      // ✅ Crear request con PKCE
      const request = new AuthSession.AuthRequest({
        clientId: CLIENT_ID,
        scopes: SCOPES,
        redirectUri: REDIRECT_URI,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
        extraParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      });

      console.log('🚀 Abriendo prompt de Google...');

      // ✅ Para APK, NO usar proxy
      const result = await request.promptAsync(discovery, {
        useProxy: false,  // ✅ IMPORTANTE para APK
      });

      console.log('📱 Resultado:', result.type);

      if (result.type === 'success') {
        console.log('✅ Código obtenido, intercambiando por tokens...');

        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: CLIENT_ID,
            code: result.params.code,
            redirectUri: REDIRECT_URI,
            extraParams: {
              code_verifier: request.codeVerifier,
            },
          },
          discovery
        );

        if (tokenResult.accessToken) {
          this.accessToken = tokenResult.accessToken;
          this.refreshToken = tokenResult.refreshToken;
          this.expirationTime = new Date().getTime() + (tokenResult.expiresIn * 1000);

          await SecureStore.setItemAsync('google_access_token', tokenResult.accessToken);

          if (tokenResult.refreshToken) {
            await SecureStore.setItemAsync('google_refresh_token', tokenResult.refreshToken);
          }

          if (tokenResult.expiresIn) {
            await SecureStore.setItemAsync('google_token_expiration', this.expirationTime.toString());
          }

          console.log('✅ Autenticación completada');
          console.log('🔑 Access Token:', tokenResult.accessToken.substring(0, 20) + '...');
          console.log('🔄 Refresh Token:', tokenResult.refreshToken ? 'Obtenido ✅' : 'No obtenido ❌');

          return {
            success: true,
            message: 'Autenticación exitosa con Google Calendar'
          };
        } else {
          throw new Error('No se recibió access token');
        }
      } else if (result.type === 'error') {
        console.error('❌ Error en resultado:', result.error);
        throw new Error(result.error?.message || 'Error desconocido en autenticación');
      } else if (result.type === 'cancel') {
        throw new Error('Autenticación cancelada por el usuario');
      } else if (result.type === 'dismiss') {
        throw new Error('Ventana de autenticación cerrada');
      } else {
        throw new Error('Resultado inesperado: ' + result.type);
      }

    } catch (error) {
      console.error('❌ Error en autenticación:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async refreshAccessToken() {
    try {
      if (!this.refreshToken) {
        const storedRefreshToken = await SecureStore.getItemAsync('google_refresh_token');
        if (!storedRefreshToken) {
          throw new Error('No hay refresh token disponible. Debes autenticarte nuevamente.');
        }
        this.refreshToken = storedRefreshToken;
      }

      console.log('🔄 Refrescando access token...');

      const tokenResult = await AuthSession.refreshAsync(
        {
          clientId: CLIENT_ID,
          refreshToken: this.refreshToken,
        },
        discovery
      );

      if (tokenResult.accessToken) {
        this.accessToken = tokenResult.accessToken;
        this.expirationTime = new Date().getTime() + (tokenResult.expiresIn * 1000);

        await SecureStore.setItemAsync('google_access_token', tokenResult.accessToken);
        await SecureStore.setItemAsync('google_token_expiration', this.expirationTime.toString());

        console.log('✅ Token refrescado exitosamente');
        return true;
      }

      throw new Error('No se pudo refrescar el token');
    } catch (error) {
      console.error('❌ Error refrescando token:', error);
      await this.logout();
      throw new Error('Tu sesión expiró. Por favor, vuelve a conectar tu cuenta de Google.');
    }
  }

  async isTokenValid() {
    try {
      const expiration = await SecureStore.getItemAsync('google_token_expiration');

      if (!expiration) {
        console.log('⚠️ No hay token de expiración');
        return false;
      }

      const expirationTime = parseInt(expiration);
      const now = new Date().getTime();
      const timeUntilExpiry = expirationTime - now;

      if (timeUntilExpiry < (5 * 60 * 1000)) {
        console.log('⏰ Token próximo a expirar, refrescando...');
        try {
          return await this.refreshAccessToken();
        } catch (error) {
          console.error('❌ Error al refrescar token automáticamente:', error);
          return false;
        }
      }

      console.log('✅ Token válido');
      return true;
    } catch (error) {
      console.error('❌ Error verificando token:', error);
      return false;
    }
  }

  async getValidToken() {
    try {
      console.log('🔍 Obteniendo token válido...');
      console.log('📦 Token en memoria:', this.accessToken ? 'Sí' : 'No');

      if (!this.accessToken) {
        console.log('📂 Buscando token en SecureStore...');
        const storedToken = await SecureStore.getItemAsync('google_access_token');

        if (!storedToken) {
          throw new Error('No hay token. Debes autenticarte primero.');
        }

        this.accessToken = storedToken;
        console.log('✅ Token recuperado de SecureStore');
      }

      const isValid = await this.isTokenValid();

      if (!isValid) {
        console.log('⏰ Token expirado, intentando refrescar...');
        const refreshed = await this.refreshAccessToken();

        if (!refreshed) {
          throw new Error('Token inválido. Debes autenticarte nuevamente.');
        }
      }

      console.log('✅ Token válido obtenido');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Error obteniendo token válido:', error);
      throw error;
    }
  }

  // ... resto de métodos (createEvent, createEventWithAttendee, etc.) permanecen igual

  async logout() {
    try {
      this.accessToken = null;
      this.refreshToken = null;
      this.expirationTime = null;

      await SecureStore.deleteItemAsync('google_access_token');
      await SecureStore.deleteItemAsync('google_refresh_token');
      await SecureStore.deleteItemAsync('google_token_expiration');

      console.log('✅ Sesión cerrada');

      return { success: true };
    } catch (error) {
      console.error('❌ Error cerrando sesión:', error);
      return { success: false, error: error.message };
    }
  }

  async isAuthenticated() {
    try {
      if (!this.accessToken) {
        const token = await SecureStore.getItemAsync('google_access_token');
        if (token) {
          this.accessToken = token;
          const refreshToken = await SecureStore.getItemAsync('google_refresh_token');
          if (refreshToken) {
            this.refreshToken = refreshToken;
          }
        }
      }

      if (!this.accessToken) {
        console.log('⚠️ No hay token guardado');
        return false;
      }

      const isValid = await this.isTokenValid();
      console.log('🔐 Token válido:', isValid);
      return isValid;
    } catch (error) {
      console.error('❌ Error verificando autenticación:', error);
      return false;
    }
  }

  async initialize() {
    try {
      const token = await SecureStore.getItemAsync('google_access_token');
      const refreshToken = await SecureStore.getItemAsync('google_refresh_token');
      const expiration = await SecureStore.getItemAsync('google_token_expiration');

      if (token && refreshToken) {
        this.accessToken = token;
        this.refreshToken = refreshToken;
        this.expirationTime = expiration ? parseInt(expiration) : null;

        console.log('✅ Servicio inicializado con tokens existentes');
        return true;
      }

      console.log('⚠️ No hay tokens guardados');
      return false;
    } catch (error) {
      console.error('❌ Error inicializando servicio:', error);
      return false;
    }
  }
}

export default new GoogleCalendarService();