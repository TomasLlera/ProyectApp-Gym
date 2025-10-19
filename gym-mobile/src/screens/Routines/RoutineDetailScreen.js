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
import { routinesAPI, calendarAPI } from '../../api/axios';

export default function RoutineDetailScreen({ route, navigation }) {
  const { routineId } = route.params;
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
      const { data } = await routinesAPI.getById(routineId);
      setRoutine(data.data);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo cargar la rutina');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const subirACalendar = async () => {
    Alert.alert(
      'Subir a Google Calendar',
      `¿Subir la rutina "${routine.nombre}" a Google Calendar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Subir',
          onPress: async () => {
            setUploadingCalendar(true);
            try {
              const response = await calendarAPI.subirRutina(routineId);
              
              Alert.alert(
                '✅ Éxito',
                `${response.data.data.eventosCreados} eventos creados en Google Calendar`
              );
            } catch (error) {
              console.error('Error:', error);
              Alert.alert(
                '❌ Error',
                error.response?.data?.error || 'No se pudo subir la rutina'
              );
            } finally {
              setUploadingCalendar(false);
            }
          }
        }
      ]
    );
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

    const phone = routine.cliente?.telefono?.replace(/[^0-9]/g, '');
    if (phone) {
      Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
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
    personalizado: '#6B7280'
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6B7280' },
  header: { backgroundColor: '#fff', padding: 24, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#3B82F6', marginBottom: 16 },
  badges: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#6B7280' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  actions: { padding: 16 },
  actionBtn: { padding: 12, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  section: { backgroundColor: '#fff', margin: 16, marginTop: 0, padding: 16, borderRadius: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  infoRow: { marginBottom: 16 },
  infoLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  infoValue: { fontSize: 16, color: '#1F2937', fontWeight: '600' },
  daysContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  dayChip: { backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  dayChipText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  exerciseCard: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 12 },
  exerciseNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  exerciseNumberText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  exerciseContent: { flex: 1 },
  exerciseName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  exerciseDescription: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  exerciseDetails: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  exerciseDetail: { alignItems: 'center' },
  detailLabel: { fontSize: 10, color: '#6B7280', marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: 'bold', color: '#1F2937' },
  grupoMuscular: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  grupoMuscularText: { color: '#fff', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  exerciseNotes: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },
});