// src/screens/Profile/GoogleCalendarScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import googleCalendarService from '../../services/googleCalendarService';

export default function GoogleCalendarScreen({ navigation }) {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // ✅ Primero inicializar para recuperar tokens
      await googleCalendarService.initialize();
      
      // Luego verificar si está autenticado
      const connected = await googleCalendarService.isAuthenticated();
      setIsConnected(connected);
      
      console.log('🔐 Estado de conexión:', connected);
    } catch (error) {
      console.error('Error verificando conexión:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      
      Alert.alert(
        '🔐 Autenticación',
        'Se abrirá el navegador para conectar con Google.\n\n' +
        '⚠️ IMPORTANTE:\n' +
        '1. Acepta los permisos en Google\n' +
        '2. Si aparece "no se puede acceder al sitio" ✅ ES NORMAL\n' +
        '3. Cierra el navegador y vuelve a la app\n' +
        '4. La conexión se habrá completado automáticamente',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => setLoading(false) },
          { 
            text: 'Continuar', 
            onPress: async () => {
              const result = await googleCalendarService.authenticate();
              
              if (result.success) {
                // Verificar nuevamente después de cerrar el navegador
                setTimeout(async () => {
                  await googleCalendarService.initialize();
                  const isAuth = await googleCalendarService.isAuthenticated();
                  setIsConnected(isAuth);
                  
                  if (isAuth) {
                    Alert.alert(
                      '✅ Conectado',
                      'Google Calendar conectado exitosamente.\n\nYa puedes sincronizar rutinas.'
                    );
                  }
                }, 1000);
              } else {
                Alert.alert('❌ Error', result.error || 'No se pudo conectar');
              }
              
              setLoading(false);
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('❌ Error:', error);
      Alert.alert('❌ Error', error.message);
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      '⚠️ Desconectar',
      '¿Seguro que quieres desconectar Google Calendar?\n\nNo podrás sincronizar rutinas hasta que vuelvas a conectar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            const result = await googleCalendarService.logout();
            if (result.success) {
              setIsConnected(false);
              Alert.alert('✅ Desconectado', 'Google Calendar desconectado');
            }
          }
        }
      ]
    );
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      
      // Crear evento de prueba
      const testEvent = {
        summary: '🧪 Evento de Prueba - O2 Gym',
        description: 'Este es un evento de prueba creado por O2 Gym',
        start: {
          dateTime: new Date().toISOString(),
          timeZone: 'America/Argentina/Buenos_Aires',
        },
        end: {
          dateTime: new Date(Date.now() + 3600000).toISOString(), // +1 hora
          timeZone: 'America/Argentina/Buenos_Aires',
        },
      };

      await googleCalendarService.createEvent(testEvent);
      
      Alert.alert(
        '✅ Prueba Exitosa',
        'Se creó un evento de prueba en tu Google Calendar.\n\nRevisa tu calendario para verificar.'
      );
      
    } catch (error) {
      Alert.alert('❌ Error', `No se pudo crear evento de prueba:\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📅 Google Calendar</Text>
      </View>

      {/* Status Card */}
      <View style={[
        styles.statusCard,
        { backgroundColor: isConnected ? '#052E16' : '#450A0A' }
      ]}>
        <Ionicons
          name={isConnected ? 'checkmark-circle' : 'close-circle'}
          size={40}
          color={isConnected ? '#10B981' : '#EF4444'}
          style={{ marginRight: 16 }}
        />
        <View style={styles.statusContent}>
          <Text style={styles.statusTitle}>
            {isConnected ? 'Conectado' : 'No Conectado'}
          </Text>
          <Text style={styles.statusDescription}>
            {isConnected 
              ? 'Puedes sincronizar rutinas con Google Calendar'
              : 'Conecta para sincronizar rutinas automáticamente'
            }
          </Text>
        </View>
      </View>

      {/* Actions */}
      {!isConnected ? (
        <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
          <Text style={styles.connectButtonText}>🔗 Conectar Google Calendar</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity style={styles.testButton} onPress={testConnection}>
            <Text style={styles.testButtonText}>🧪 Probar Conexión</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
            <Text style={styles.disconnectButtonText}>🚪 Desconectar</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Info */}
      <View style={styles.infoCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Ionicons name="information-circle-outline" size={18} color="#F97316" />
          <Text style={styles.infoTitle}>¿Cómo funciona?</Text>
        </View>
        <Text style={styles.infoText}>
          • Conecta tu cuenta de Google{'\n'}
          • Crea rutinas para tus clientes{'\n'}
          • Sincroniza automáticamente a Google Calendar{'\n'}
          • Los clientes reciben eventos en su calendario{'\n'}
          • Se crean recordatorios automáticos
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
  },
  header: {
    backgroundColor: '#1A1A1A',
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 3,
    borderBottomColor: '#F97316',
  },
  backButton: {
    fontSize: 16,
    color: '#F97316',
    marginBottom: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statusCard: {
    flexDirection: 'row',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5F5F5',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#A1A1AA',
  },
  connectButton: {
    backgroundColor: '#F97316',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EA6C0A',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#3B82F6',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disconnectButton: {
    backgroundColor: '#EF4444',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  disconnectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#1C1C1E',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5F5F5',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#A1A1AA',
    lineHeight: 22,
  },
});