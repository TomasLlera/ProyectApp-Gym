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
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('groups'); // 'groups' o 'individual'

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [viewMode])
  );

  const loadData = async () => {
    try {
      if (viewMode === 'groups') {
        const { data } = await routinesAPI.getGrouped();
        setGroups(data.data.groups);
      } else {
        const { data } = await routinesAPI.getAll();
        setRoutines(data.data.routines);
      }
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
            console.log('🗑️ Eliminando rutina con ID:', id);
            await routinesAPI.delete(id);
            Alert.alert('Éxito', 'Rutina eliminada');
            loadData(); // ✅ Cambiado de loadRoutines() a loadData()
          } catch (error) {
            console.error('Error eliminando:', error);
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
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateTemplate')} // Crear plantilla
          >
            <Text style={styles.addButtonText}>+ Nueva</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: '#8B5CF6' }]}
            onPress={() => navigation.navigate('RoutineTemplates')}
          >
            <Text style={styles.addButtonText}>📚 Grupo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'groups' && styles.toggleButtonActive]}
          onPress={() => setViewMode('groups')}
        >
          <Text style={[styles.toggleText, viewMode === 'groups' && styles.toggleTextActive]}>
            👥 Por Grupos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'individual' && styles.toggleButtonActive]}
          onPress={() => setViewMode('individual')}
        >
          <Text style={[styles.toggleText, viewMode === 'individual' && styles.toggleTextActive]}>
            📋 Individual
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        {viewMode === 'groups' ? (
          // Vista de grupos
          groups.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🏋️</Text>
              <Text style={styles.emptyText}>No hay grupos de rutinas</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('RoutineTemplates')}
              >
                <Text style={styles.emptyButtonText}>Crear desde Plantilla</Text>
              </TouchableOpacity>
            </View>
          ) : (
            groups.map((group) => (
              <GroupCard
                key={group._id}
                group={group}
                onPress={() => navigation.navigate('GroupDetail', { group })}
              />
            ))
          )
        ) : (
          // Vista individual
          routines.length === 0 ? (
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
          )
        )}
      </ScrollView>
    </View>
  );
}

function GroupCard({ group, onPress }) {
  const getTipoColor = (tipo) => {
    const colors = {
      fuerza: '#EF4444',
      hipertrofia: '#8B5CF6',
      cardio: '#F59E0B',
      resistencia: '#10B981',
      funcional: '#3B82F6',
      personalizado: '#6B7280'
    };
    return colors[tipo] || colors.personalizado;
  };

  return (
    <TouchableOpacity style={styles.groupCard} onPress={onPress}>
      <View style={styles.groupHeader}>
        <View style={styles.groupTitle}>
          <Text style={styles.groupName}>{group.nombre}</Text>
          <View style={[styles.tipoBadge, { backgroundColor: getTipoColor(group.tipo) }]}>
            <Text style={styles.tipoBadgeText}>{group.tipo}</Text>
          </View>
        </View>
        <View style={styles.clientCount}>
          <Text style={styles.clientCountText}>{group.cantidad}</Text>
          <Text style={styles.clientCountLabel}>clientes</Text>
        </View>
      </View>

      <View style={styles.groupInfo}>
        <Text style={styles.infoText}>💪 {group.ejercicios?.length || 0} ejercicios</Text>
        <Text style={styles.infoText}>⏱️ {group.duracionEstimada} min</Text>
        <Text style={styles.infoText}>📅 {group.diasSemana?.length || 0} días</Text>
      </View>

      <View style={styles.clientList}>
        {group.clientes?.slice(0, 3).map((cliente, index) => (
          <Text key={index} style={styles.clientTag}>
            {cliente.nombre} {cliente.apellido}
          </Text>
        ))}
        {group.cantidad > 3 && (
          <Text style={styles.moreClients}>+{group.cantidad - 3} más</Text>
        )}
      </View>
    </TouchableOpacity>
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
  toggleContainer: { flexDirection: 'row', padding: 16, paddingBottom: 8, gap: 8 },
  toggleButton: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  toggleButtonActive: { backgroundColor: '#3B82F6' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  toggleTextActive: { color: '#fff' },
  list: { flex: 1, paddingHorizontal: 16 },
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
  groupCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  groupTitle: { flex: 1 },
  groupName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  clientCount: { backgroundColor: '#EEF2FF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center' },
  clientCountText: { fontSize: 24, fontWeight: 'bold', color: '#3B82F6' },
  clientCountLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  groupInfo: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  clientList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  clientTag: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 12, color: '#374151' },
  moreClients: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 12, color: '#3B82F6', fontWeight: '600' },
});