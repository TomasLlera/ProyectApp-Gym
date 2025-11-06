// src/screens/Routines/RoutineDetailScreen.js
import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useDatabase } from '../../context/DatabaseContext';
import googleCalendarService from '../../services/googleCalendarService';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// Importar la instancia configurada de axios
const axiosInstance = axios.create({
  baseURL: 'http://192.168.0.83:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor para agregar token automáticamente
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 Token agregado a la petición de rutina');
    } else {
      console.log('❌ No hay token disponible para rutina');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default function RoutineDetailScreen({ route, navigation }) {
  const { routineId } = route.params;
  const { routines } = useDatabase();
  
  const [routine, setRoutine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingCalendar, setUploadingCalendar] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadRoutine();
    }, [routineId])
  );

  const loadRoutine = async () => {
    try {
      const routineData = await routines.getById(routineId);
      setRoutine(routineData);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo cargar la rutina');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const subirACalendar = async () => {
    try {
      console.log('🔄 Iniciando proceso para Google Calendar...');
      
      // Validar datos de la rutina
      if (!routine.diasSemana || routine.diasSemana.length === 0) {
        Alert.alert(
          'Error',
          'La rutina debe tener al menos un día asignado para poder subirla a Google Calendar'
        );
        return;
      }

      if (!routine.cliente) {
        Alert.alert('Error', 'Falta información del cliente');
        return;
      }

      // Confirmar subida
      Alert.alert(
        'Subir a Google Calendar',
        `¿Subir la rutina "${routine.nombre}" a Google Calendar?\n\nSe crearán eventos para: ${routine.diasSemana.join(', ')}`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Subir',
            onPress: async () => {
              setUploadingCalendar(true);
              try {
                console.log('📤 Subiendo rutina a Google Calendar...');
                
                const response = await axiosInstance.post('/calendar/subir-rutina-completa', {
                  nombre: routine.nombre,
                  descripcion: routine.descripcion,
                  tipo: routine.tipo,
                  nivel: routine.nivel,
                  duracionEstimada: routine.duracionEstimada,
                  diasSemana: routine.diasSemana,
                  ejercicios: routine.ejercicios,
                  cliente: {
                    nombre: routine.cliente.nombre,
                    apellido: routine.cliente.apellido,
                    email: routine.cliente.email,     // ⬅️ IMPORTANTE
                    telefono: routine.cliente.telefono
                  }
                });
                
                console.log('📬 Notificaciones enviadas:', response.data.notificaciones);
                // { email: 'Enviado', whatsapp: 'Enviado' }
                
                let successMessage = response.data.message;
                
                // Agregar información de notificaciones si está disponible
                if (response.data.notificaciones) {
                  const notifs = response.data.notificaciones;
                  successMessage += '\n\n📬 Notificaciones:';
                  if (notifs.email) {
                    successMessage += `\n📧 Email: ${notifs.email}`;
                  }
                  if (notifs.whatsapp) {
                    successMessage += `\n💬 WhatsApp: ${notifs.whatsapp}`;
                  }
                }
                
                Alert.alert('✅ Éxito', successMessage);
                
              } catch (error) {
                console.error('❌ Error:', error);
                console.error('❌ Error response:', error.response?.data);
                
                let errorMessage = 'No se pudo subir la rutina a Google Calendar';
                
                if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
                  errorMessage = 'No se puede conectar al servidor. Verifica que esté ejecutándose en 192.168.0.83:3000';
                } else if (error.response?.status === 500) {
                  errorMessage = `Error del servidor: ${error.response?.data?.error || 'Error interno del servidor'}`;
                } else if (error.response?.data?.error) {
                  errorMessage = error.response.data.error;
                }
                
                Alert.alert('Error', errorMessage);
              } finally {
                setUploadingCalendar(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error general:', error);
      Alert.alert('Error', `Error inesperado: ${error.message}`);
    }
  };

  const shareRoutine = () => {
    if (!routine) return;

    let message = `🏋️ *${routine.nombre}*\n\n`;
    message += `📋 Tipo: ${routine.tipo}\n`;
    message += `🎯 Nivel: ${routine.nivel}\n`;
    message += `⏱️ Duración: ${routine.duracionEstimada} min\n\n`;
    message += `*Ejercicios:*\n`;
    
    routine.ejercicios?.forEach((ej, index) => {
      message += `${index + 1}. ${ej.nombre} - ${ej.series}x${ej.repeticiones}\n`;
    });

    let phone = routine.cliente?.telefono;
    if (phone) {
      // Limpiar el teléfono de caracteres no numéricos excepto +
      phone = phone.replace(/[^0-9+]/g, '');
      
      // Si ya empieza con +54, usar tal como está (no agregar nada más)
      if (phone.startsWith('+54')) {
        // Ya tiene el formato correcto
      } else if (phone.startsWith('54')) {
        phone = '+' + phone;
      } else {
        // Si no tiene código de país, agregar +54
        phone = '+54' + phone;
      }
      
      // Para WhatsApp, remover el + pero mantener el código de país
      const whatsappNumber = phone.replace('+', '');
      
      // Mostrar confirmación con el número antes de enviar
      Alert.alert(
        'Confirmar envío por WhatsApp',
        `¿Enviar rutina a:\n\n📱 ${phone}\n\nCliente: ${routine.cliente?.nombre} ${routine.cliente?.apellido}`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Enviar',
            onPress: () => {
              Linking.openURL(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`);
            }
          }
        ]
      );
    } else {
      Alert.alert('Error', 'El cliente no tiene teléfono registrado');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{routine.nombre}</Text>
        <Text style={styles.subtitle}>
          {routine.cliente?.nombre} {routine.cliente?.apellido}
        </Text>
        
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: getTipoColor(routine.tipo) }]}>
            <Text style={styles.badgeText}>{routine.tipo}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{routine.nivel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
          onPress={shareRoutine}
        >
          <Text style={styles.actionBtnText}>💬 Compartir</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#8B5CF6', marginTop: 12 }]}
          onPress={subirACalendar}
          disabled={uploadingCalendar}
        >
          <Text style={styles.actionBtnText}>
            {uploadingCalendar ? '⏳ Subiendo...' : '📅 Google Calendar'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>
        
        {routine.descripcion && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Descripción</Text>
            <Text style={styles.infoValue}>{routine.descripcion}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Duración</Text>
          <Text style={styles.infoValue}>⏱️ {routine.duracionEstimada} minutos</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Días de entrenamiento</Text>
          <View style={styles.daysContainer}>
            {routine.diasSemana?.map((dia) => (
              <View key={dia} style={styles.dayChip}>
                <Text style={styles.dayChipText}>{dia.slice(0, 3).toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Ejercicios ({routine.ejercicios?.length || 0})
        </Text>

        {routine.ejercicios?.sort((a, b) => a.orden - b.orden).map((ejercicio, index) => (
          <View key={index} style={styles.exerciseCard}>
            <View style={styles.exerciseNumber}>
              <Text style={styles.exerciseNumberText}>{index + 1}</Text>
            </View>

            <View style={styles.exerciseContent}>
              <Text style={styles.exerciseName}>{ejercicio.nombre}</Text>
              
              {ejercicio.descripcion && (
                <Text style={styles.exerciseDescription}>{ejercicio.descripcion}</Text>
              )}

              <View style={styles.exerciseDetails}>
                <View style={styles.exerciseDetail}>
                  <Text style={styles.detailLabel}>Series</Text>
                  <Text style={styles.detailValue}>{ejercicio.series}</Text>
                </View>
                <View style={styles.exerciseDetail}>
                  <Text style={styles.detailLabel}>Reps</Text>
                  <Text style={styles.detailValue}>{ejercicio.repeticiones}</Text>
                </View>
                <View style={styles.exerciseDetail}>
                  <Text style={styles.detailLabel}>Peso</Text>
                  <Text style={styles.detailValue}>{ejercicio.peso}</Text>
                </View>
                <View style={styles.exerciseDetail}>
                  <Text style={styles.detailLabel}>Descanso</Text>
                  <Text style={styles.detailValue}>{ejercicio.descanso}</Text>
                </View>
              </View>

              <View style={[styles.grupoMuscular, { backgroundColor: getGrupoColor(ejercicio.grupoMuscular) }]}>
                <Text style={styles.grupoMuscularText}>{ejercicio.grupoMuscular}</Text>
              </View>

              {ejercicio.notas && (
                <Text style={styles.exerciseNotes}>💡 {ejercicio.notas}</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function getTipoColor(tipo) {
  const colors = {
    fuerza: '#EF4444',
    hipertrofia: '#8B5CF6',
    cardio: '#F59E0B',
    resistencia: '#10B981',
    funcional: '#3B82F6',
    personalizado: '#FF6B35'  // Naranja O2 para personalizado
  };
  return colors[tipo] || colors.personalizado;
}

function getGrupoColor(grupo) {
  const colors = {
    pecho: '#EF4444',
    espalda: '#3B82F6',
    piernas: '#10B981',
    hombros: '#F59E0B',
    brazos: '#8B5CF6',
    abdominales: '#EC4899',
    cardio: '#F97316',
    fullbody: '#6B7280'
  };
  return colors[grupo] || colors.fullbody;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { fontSize: 16, color: '#6B7280' },
  header: { 
    backgroundColor: '#1A1A1A',  // Negro O2
    padding: 24, 
    borderBottomWidth: 3, 
    borderBottomColor: '#FF6B35',  // Naranja O2
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#FFFFFF', 
    marginBottom: 8 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#FF8456',  // Naranja claro
    marginBottom: 16 
  },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: { 
    color: '#FFFFFF', 
    fontSize: 12, 
    fontWeight: 'bold', 
    textTransform: 'uppercase' 
  },
  actions: { padding: 16 },
  actionBtn: { 
    padding: 12, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 2,
  },
  actionBtnText: { 
    color: '#FFFFFF', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  section: { 
    backgroundColor: '#FFFFFF', 
    margin: 16, 
    marginTop: 0, 
    padding: 16, 
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',  // Naranja O2
    borderWidth: 1,
    borderColor: '#FFE5DC',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#1A1A1A',  // Negro O2
    marginBottom: 16 
  },
  infoRow: { marginBottom: 16 },
  infoLabel: { 
    fontSize: 14, 
    color: '#6B7280', 
    marginBottom: 4 
  },
  infoValue: { 
    fontSize: 16, 
    color: '#1A1A1A',  // Negro O2
    fontWeight: '600' 
  },
  daysContainer: { 
    flexDirection: 'row', 
    gap: 8, 
    flexWrap: 'wrap', 
    marginTop: 8 
  },
  dayChip: { 
    backgroundColor: '#FFE5DC',  // Naranja muy claro
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  dayChipText: { 
    color: '#E55A2B',  // Naranja oscuro
    fontSize: 11, 
    fontWeight: 'bold' 
  },
  exerciseCard: { 
    flexDirection: 'row', 
    backgroundColor: '#F9FAFB', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',  // Naranja O2
  },
  exerciseNumber: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#FF6B35',  // Naranja O2
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E55A2B',
  },
  exerciseNumberText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  exerciseContent: { flex: 1 },
  exerciseName: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#1A1A1A',  // Negro O2
    marginBottom: 4 
  },
  exerciseDescription: { 
    fontSize: 13, 
    color: '#6B7280', 
    marginBottom: 8 
  },
  exerciseDetails: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 8 
  },
  exerciseDetail: { alignItems: 'center' },
  detailLabel: { 
    fontSize: 10, 
    color: '#6B7280', 
    marginBottom: 2 
  },
  detailValue: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#1A1A1A'  // Negro O2
  },
  grupoMuscular: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  grupoMuscularText: { 
    color: '#FFFFFF', 
    fontSize: 11, 
    fontWeight: 'bold', 
    textTransform: 'uppercase' 
  },
  exerciseNotes: { 
    fontSize: 12, 
    color: '#6B7280', 
    fontStyle: 'italic' 
  },
});