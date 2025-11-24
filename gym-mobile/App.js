// App.js - CÓDIGO NUEVO COMPLETO

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { AppConfigProvider } from './src/context/AppConfigContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/database/db';
import { syncFromMongoDB, shouldSync } from './src/database/syncService';
import googleCalendarService from './src/googleCalendar/googleCalendarService';

// Prevenir que se oculte automáticamente
SplashScreen.preventAutoHideAsync();

function RootApp() {
  const { user, loading: authLoading } = useAuth();
  const [appIsReady, setAppIsReady] = useState(false);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('🚀 Inicializando aplicación...');
        
        // Configurar navegación inmersiva en Android
        if (Platform.OS === 'android') {
          try {
            // Ocultar barra de navegación
            await NavigationBar.setVisibilityAsync("hidden");
            
            // Establecer comportamiento inmersivo
            await NavigationBar.setBehaviorAsync("inset-swipe");
            
            // Color transparente
            await NavigationBar.setBackgroundColorAsync("#00000000");
            
            // Botones claros
            await NavigationBar.setButtonStyleAsync("light");
            
            console.log('✅ Navegación inmersiva configurada');
          } catch (error) {
            console.log('⚠️ Error configurando barra de navegación:', error);
          }
        }
        
        await initDatabase();
        console.log('✅ Base de datos SQLite inicializada');

        // Inicializar Google Calendar Service
        await googleCalendarService.initialize();
        console.log('✅ Google Calendar Service inicializado');

        if (user) {
          await performSync();
        }

        // Mantener splash 2 segundos mínimo
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error('❌ Error inicializando app:', error);
        setSyncError(error.message);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, [user]);

  // ✅ Deep Link Handler para Google OAuth
  useEffect(() => {
    const handleDeepLink = (event) => {
      const url = event.url;
      console.log('🔗 Deep link recibido:', url);
      
      // Aquí podrías manejar el redirect si es necesario
      if (url.includes('auth.expo.io')) {
        console.log('✅ Autenticación completada vía deep link');
      }
    };

    // Escuchar deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Verificar si la app se abrió con un deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 URL inicial:', url);
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  const performSync = async () => {
    try {
      const needsSync = await shouldSync();
      
      if (needsSync) {
        const token = await AsyncStorage.getItem('token');
        
        if (token) {
          await syncFromMongoDB(token);
          console.log('✅ Sincronización completada');
        } else {
          console.log('⚠️ No hay token disponible para sincronización');
        }
      }
    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      setSyncError(error.message);
    }
  };

  if (syncError) {
    console.warn('Advertencia de sincronización:', syncError);
  }

  if (!appIsReady) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <AppConfigProvider>
      <DatabaseProvider>
        <AuthProvider>
          <RootApp />
        </AuthProvider>
      </DatabaseProvider>
    </AppConfigProvider>
  );
}