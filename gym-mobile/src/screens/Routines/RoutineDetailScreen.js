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

export default function RoutineDetailScreen({ route, navigation }) {
  const { routineId } = route.params;
  const { routines } = useDatabase();
  
  const [routine, setRoutine] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // ============================================
  // 📱 FUNCIÓN MEJORADA PARA COMPARTIR POR WHATSAPP
  // ============================================
  const shareRoutine = () => {
    if (!routine) return;

    // Crear mensaje formateado con markdown de WhatsApp
    let message = `🏋️ *${routine.nombre}*\n\n`;
    message += `📋 Tipo: ${routine.tipo}\n`;
    message += `🎯 Nivel: ${routine.nivel}\n`;
    message += `⏱️ Duración: ${routine.duracionEstimada} min\n\n`;
    
    if (routine.descripcion) {
      message += `📝 Descripción:\n${routine.descripcion}\n\n`;
    }
    
    message += `💪 *Ejercicios (${routine.ejercicios?.length || 0}):*\n\n`;
    
    routine.ejercicios?.forEach((ej, index) => {
      message += `${index + 1}. *${ej.nombre}*\n`;
      message += `   ${ej.series}x${ej.repeticiones}`;
      
      if (ej.peso && ej.peso !== 'A definir') {
        message += ` - ${ej.peso}`;
      }
      
      message += `\n   Descanso: ${ej.descanso}\n`;
      
      if (ej.grupoMuscular) {
        message += `   🎯 ${ej.grupoMuscular}\n`;
      }
      
      if (ej.notas) {
        message += `   💡 ${ej.notas}\n`;
      }
      
      message += `\n`;
    });
    
    message += `\n📍 O2 Gym\n`;
    message += `💪 ¡Vamos por esos objetivos!`;

    const phone = routine.cliente?.telefono;
    
    if (phone) {
      // Limpiar el teléfono
      let cleanPhone = phone.replace(/[^0-9+]/g, '');
      
      if (cleanPhone.startsWith('+54')) {
        // Ya tiene el formato correcto
      } else if (cleanPhone.startsWith('54')) {
        cleanPhone = '+' + cleanPhone;
      } else {
        cleanPhone = '+54' + cleanPhone.replace(/^0/, '');
      }
      
      const whatsappNumber = cleanPhone.replace('+', '');
      
      Alert.alert(
        '📱 Compartir por WhatsApp',
        `¿Enviar rutina a:\n\n` +
        `📞 ${cleanPhone}\n` +
        `👤 ${routine.cliente?.nombre} ${routine.cliente?.apellido}\n\n` +
        `Se abrirá WhatsApp con el mensaje preparado.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: '📤 Vista Previa',
            onPress: () => {
              Alert.alert(
                'Vista Previa',
                message,
                [
                  { text: 'Volver', style: 'cancel' },
                  {
                    text: '✅ Enviar',
                    onPress: () => {
                      Linking.openURL(
                        `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
                      );
                    }
                  }
                ]
              );
            }
          },
          {
            text: '✅ Enviar Ahora',
            onPress: () => {
              Linking.openURL(
                `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
              );
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
          style={[styles.actionBtn, { backgroundColor: '#25D366' }]}
          onPress={shareRoutine}
        >
          <Text style={styles.actionBtnText}>💬 Compartir WhatsApp</Text>
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
    personalizado: '#FF6B35'
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
    backgroundColor: '#1A1A1A',
    padding: 24, 
    borderBottomWidth: 3, 
    borderBottomColor: '#FF6B35',
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
    color: '#FF8456',
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
    borderColor: '#128C7E',
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
    borderLeftColor: '#FF6B35',
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
    color: '#1A1A1A',
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
    color: '#1A1A1A',
    fontWeight: '600' 
  },
  daysContainer: { 
    flexDirection: 'row', 
    gap: 8, 
    flexWrap: 'wrap', 
    marginTop: 8 
  },
  dayChip: { 
    backgroundColor: '#FFE5DC',
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  dayChipText: { 
    color: '#E55A2B',
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
    borderLeftColor: '#FF6B35',
  },
  exerciseNumber: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#FF6B35',
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
    color: '#1A1A1A',
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
    color: '#1A1A1A'
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