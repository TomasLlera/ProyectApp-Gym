// App.js - CÓDIGO NUEVO COMPLETO

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { AppConfigProvider } from './src/context/AppConfigContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/database/db';
import { syncFromMongoDB, shouldSync } from './src/database/syncService';

function RootApp() {
  const { user, loading: authLoading } = useAuth();
  const [dbReady, setDbReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Inicializando aplicación...');
        await initDatabase();
        console.log('✅ Base de datos SQLite inicializada');

        if (user) {
          await performSync();
        }

        setDbReady(true);
      } catch (error) {
        console.error('❌ Error inicializando app:', error);
        setSyncError(error.message);
        setDbReady(true);
      }
    };

    initializeApp();
  }, [user]);

  const performSync = async () => {
    try {
      const needsSync = await shouldSync();
      
      if (needsSync) {
        setSyncing(true);
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
    } finally {
      setSyncing(false);
    }
  };

  if (syncing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#4F46E5' }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>
          Sincronizando datos...
        </Text>
      </View>
    );
  }

  if (syncError) {
    console.warn('Advertencia de sincronización:', syncError);
  }

  if (!dbReady || authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#4F46E5' }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>
          Cargando aplicación...
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
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