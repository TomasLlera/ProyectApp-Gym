cat > src/config/google.js << 'EOF'
// src/config/google.js
import { Platform } from 'react-native';

export const GOOGLE_CONFIG = {
  // Tu Android Client ID (correcto)
  CLIENT_ID: '257288535991-46dsamg5l0s9g96n6as6ea3idli3oe1m.apps.googleusercontent.com',
  
  SCOPES: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ],
  
  // ⚠️ NO usar scheme para Android
  // Android usa el package name automáticamente
};
EOF