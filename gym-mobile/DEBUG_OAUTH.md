🔧 DIAGNÓSTICO GOOGLE CALENDAR OAUTH

❓ POSIBLES PROBLEMAS Y SOLUCIONES:

1. 🔑 CONFIGURACIÓN GOOGLE CLOUD CONSOLE:
   ========================================
   Ve a: https://console.cloud.google.com/apis/credentials

   Tu Client ID: 1018667781503-6h8m5lt9ptjgcvkm7np8rpjjoe0h3m66.apps.googleusercontent.com
   
   ASEGÚRATE de tener estas URIs de redirección:
   - exp://192.168.0.83:8082/--/expo-auth-session
   - gym-mobile://expo-auth-session
   - http://localhost:8082/expo-auth-session (para web)

2. 📱 PLATAFORMA DE PRUEBA:
   =========================
   - Expo Go: Requiere URIs específicas
   - Web: Más fácil para probar inicialmente
   - Simulador: Requiere configuración adicional

3. 🐛 PROBLEMAS COMUNES:
   =====================
   - Google OAuth no funciona en Expo Go fácilmente
   - Necesitas URI de redirección exacta
   - Scopes mal configurados
   - Client ID incorrecto

4. 🛠️ SOLUCIÓN TEMPORAL - PROBAR EN WEB:
   ======================================
   Presiona 'w' en la terminal para abrir en web browser
   Esto es más fácil para probar OAuth inicialmente

5. 🔄 ALTERNATIVA SIMPLE:
   ======================
   Podemos implementar un método más simple:
   - Que el usuario copie/pegue un código de autorización
   - Usar device flow en lugar de web flow
   - Implementar deep linking manual

¿QUÉ ESPECÍFICAMENTE ESTÁ PASANDO?
- ¿Se abre navegador?
- ¿Aparece error?
- ¿No pasa nada?