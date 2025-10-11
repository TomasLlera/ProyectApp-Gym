// src/screens/Routines/RoutinesScreen.js
import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { routinesAPI } from '../../api/axios';

export default function RoutinesScreen({ navigation }) {
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadRoutines();
    }, [])
  );

  const loadRoutines = async () => {
    try {
      const { data } = await routinesAPI.getAll();
      setRoutines(data.data.routines);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudieron cargar las rutinas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const deleteRoutine = (id) => {
    Alert.alert(
      'Eliminar Rutina',
      '¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await routinesAPI.delete(id);
              Alert.alert('Éxito', 'Rutina eliminada');
              loadRoutines();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏋️ Rutinas</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('RoutineTemplates')}
        >
          <Text style={styles.addButtonText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadRoutines} />}
      >
        {routines.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏋️</Text>
            <Text style={styles.emptyText}>No hay rutinas</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('RoutineTemplates')}
            >
              <Text style={styles.emptyButtonText}>Crear desde Plantilla</Text>
            </TouchableOpacity>
          </View>
        ) : (
          routines.map((routine) => (
            <TouchableOpacity
              key={routine._id}
              style={styles.routineCard}
              onPress={() => navigation.navigate('RoutineDetail', { routineId: routine._id })}
            >
              <View style={styles.routineHeader}>
                <Text style={styles.routineName}>{routine.nombre}</Text>
                <View style={[styles.tipoBadge, { backgroundColor: getTipoColor(routine.tipo) }]}>
                  <Text style={styles.tipoBadgeText}>{routine.tipo}</Text>
                </View>
              </View>

              <Text style={styles.clienteName}>
                👤 {routine.cliente?.nombre} {routine.cliente?.apellido}
              </Text>

              <View style={styles.routineInfo}>
                <Text style={styles.infoText}>💪 {routine.ejercicios?.length || 0} ejercicios</Text>
                <Text style={styles.infoText}>⏱️ {routine.duracionEstimada} min</Text>
                <Text style={styles.infoText}>📅 {routine.diasSemana?.length || 0} días</Text>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  deleteRoutine(routine._id);
                }}
              >
                <Text style={styles.deleteButtonText}>🗑️ Eliminar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6B7280' },
  header: { backgroundColor: '#fff', padding: 24, paddingTop: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1F2937' },
  addButton: { backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  list: { flex: 1, padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#6B7280', marginBottom: 24 },
  emptyButton: { backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  routineCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  routineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  routineName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', flex: 1 },
  tipoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tipoBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  clienteName: { fontSize: 14, color: '#3B82F6', marginBottom: 12, fontWeight: '600' },
  routineInfo: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  infoText: { fontSize: 12, color: '#6B7280' },
  deleteButton: { backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  deleteButtonText: { color: '#DC2626', fontSize: 13, fontWeight: 'bold' },
});