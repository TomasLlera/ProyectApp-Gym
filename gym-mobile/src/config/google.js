import * as AuthSession from 'expo-auth-session';

export const GOOGLE_CONFIG = {
  CLIENT_ID: '257288535991-46dsamg5l0s9g96n6as6ea3idli3oe1m.apps.googleusercontent.com', // WEB CLIENT
  REDIRECT_URI: AuthSession.makeRedirectUri({
    native: 'com.gymapp.mobile:/oauthredirect'
  }),
  SCOPES: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events'
  ],
};
