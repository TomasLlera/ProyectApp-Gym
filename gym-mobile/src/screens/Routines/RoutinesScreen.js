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
import { useDatabase } from '../../context/DatabaseContext';

export default function RoutinesScreen({ navigation }) {
  const { routines: routinesService } = useDatabase();
  
  const [routines, setRoutines] = useState([]);
  const [groups, setGroups] = useState([]);
  const [clientRoutines, setClientRoutines] = useState([]); // Nuevos datos para vista individual
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
        const groupsData = await routinesService.getGrouped();
        setGroups(groupsData);
      } else {
        const routinesData = await routinesService.getAll();
        console.log('📝 Rutinas cargadas:', routinesData.length);
        setRoutines(routinesData);
        
        // Agrupar rutinas por cliente para la vista individual
        const rutinasIndividuales = routinesData.filter(r => r.clienteId && r.cliente);
        console.log('👥 Rutinas con cliente:', rutinasIndividuales.length);
        
        const clientesConRutinas = {};
        
        rutinasIndividuales.forEach(rutina => {
          const clienteId = rutina.clienteId;
          if (!clientesConRutinas[clienteId]) {
            clientesConRutinas[clienteId] = {
              cliente: rutina.cliente,
              rutinas: []
            };
          }
          clientesConRutinas[clienteId].rutinas.push(rutina);
        });
        
        const clientRoutinesArray = Object.values(clientesConRutinas);
        console.log('📊 Clientes con rutinas agrupados:', clientRoutinesArray.length);
        setClientRoutines(clientRoutinesArray);
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
              await routinesService.delete(id);
              Alert.alert('Éxito', 'Rutina eliminada');
              loadData();
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
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.templateButton}
            onPress={() => navigation.navigate('CreateTemplate')}
          >
            <Text style={styles.templateButtonIcon}>✨</Text>
            <Text style={styles.templateButtonText}>Nueva Plantilla</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.viewTemplatesButton}
            onPress={() => navigation.navigate('RoutineTemplates')}
          >
            <Text style={styles.viewTemplatesButtonIcon}>📚</Text>
            <Text style={styles.viewTemplatesButtonText}>Ver Plantillas</Text>
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
          <>
            {groups.length > 0 && (
              <View style={styles.createRoutineSection}>
                <TouchableOpacity
                  style={styles.createNewRoutineButton}
                  onPress={() => navigation.navigate('RoutineTemplates')}
                >
                  <Text style={styles.createNewRoutineIcon}>🚀</Text>
                  <View style={styles.createNewRoutineTextContainer}>
                    <Text style={styles.createNewRoutineTitle}>Crear Nueva Rutina</Text>
                    <Text style={styles.createNewRoutineSubtitle}>Usa una plantilla para crear rutinas rápidamente</Text>
                  </View>
                  <Text style={styles.createNewRoutineArrow}>→</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {groups.length === 0 ? (
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
                  key={group._id || group.id}
                  group={group}
                  onPress={() => navigation.navigate('GroupDetail', { group })}
                />
              ))
            )}
          </>
        ) : (
          // Vista individual - Clientes con sus rutinas
          <>
            {clientRoutines.length > 0 && (
              <View style={styles.createRoutineSection}>
                <TouchableOpacity
                  style={styles.createNewRoutineButton}
                  onPress={() => navigation.navigate('RoutineTemplates')}
                >
                  <Text style={styles.createNewRoutineIcon}>➕</Text>
                  <View style={styles.createNewRoutineTextContainer}>
                    <Text style={styles.createNewRoutineTitle}>Asignar Nueva Rutina</Text>
                    <Text style={styles.createNewRoutineSubtitle}>Crea rutinas individuales para tus clientes</Text>
                  </View>
                  <Text style={styles.createNewRoutineArrow}>→</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {clientRoutines.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🏋️</Text>
                <Text style={styles.emptyText}>No hay rutinas individuales</Text>
                <Text style={styles.emptySubtext}>Las rutinas individuales aparecen cuando asignas plantillas a clientes específicos</Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate('RoutineTemplates')}
                >
                  <Text style={styles.emptyButtonText}>Crear desde Plantilla</Text>
                </TouchableOpacity>
              </View>
            ) : (
              clientRoutines.map((clientData, index) => (
                <View key={clientData.cliente?.id || clientData.cliente?._id || `client-${index}`} style={styles.clientCard}>
                  {/* Header del Cliente mejorado */}
                  <View style={styles.clientHeader}>
                    <View style={styles.clientAvatar}>
                      <Text style={styles.clientAvatarText}>
                        {clientData.cliente?.nombre?.charAt(0) || 'C'}{clientData.cliente?.apellido?.charAt(0) || 'L'}
                      </Text>
                    </View>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>
                        {clientData.cliente?.nombre || 'Cliente'} {clientData.cliente?.apellido || 'Desconocido'}
                      </Text>
                      <Text style={styles.clientEmail}>{clientData.cliente?.email || 'Sin email'}</Text>
                      <Text style={styles.clientPhone}>{clientData.cliente?.telefono || 'Sin teléfono'}</Text>
                    </View>
                    <View style={styles.routineCount}>
                      <Text style={styles.routineCountText}>{clientData.rutinas.length}</Text>
                      <Text style={styles.routineCountLabel}>rutina{clientData.rutinas.length !== 1 ? 's' : ''}</Text>
                    </View>
                  </View>

                  {/* Botón para agregar más rutinas al cliente */}
                  <TouchableOpacity
                    style={styles.addRoutineToClientButton}
                    onPress={() => navigation.navigate('RoutineTemplates', { clienteId: clientData.cliente?.id })}
                  >
                    <Text style={styles.addRoutineToClientIcon}>🎯</Text>
                    <Text style={styles.addRoutineToClientText}>Agregar rutina a {clientData.cliente?.nombre}</Text>
                  </TouchableOpacity>

                  {/* Lista de Rutinas del Cliente */}
                  {clientData.rutinas.map((routine, routineIndex) => (
                    <TouchableOpacity
                      key={routine.id || routine._id || `routine-${routineIndex}`}
                      style={styles.routineItem}
                      onPress={() => navigation.navigate('RoutineDetail', { routineId: routine.id || routine._id })}
                    >
                      <View style={styles.routineItemHeader}>
                        <Text style={styles.routineItemName}>{routine.nombre}</Text>
                        <View style={[styles.tipoBadge, { backgroundColor: getTipoColor(routine.tipo) }]}>
                          <Text style={styles.tipoBadgeText}>{routine.tipo}</Text>
                        </View>
                      </View>

                      <View style={styles.routineItemInfo}>
                        <Text style={styles.infoText}>💪 {routine.ejercicios?.length || 0} ejercicios</Text>
                        <Text style={styles.infoText}>⏱️ {routine.duracionEstimada} min</Text>
                        <Text style={styles.infoText}>📅 {routine.diasSemana?.length || 0} días</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          deleteRoutine(routine.id || routine._id);
                        }}
                      >
                        <Text style={styles.deleteButtonText}>🗑️ Eliminar</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            )}
          </>
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
  
  // Header mejorado
  header: { 
    backgroundColor: '#fff', 
    padding: 20, 
    paddingTop: 48, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  headerActions: { flexDirection: 'row', gap: 12 },
  
  // Botones del header rediseñados
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  templateButtonIcon: { fontSize: 16, marginRight: 8 },
  templateButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  
  viewTemplatesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  viewTemplatesButtonIcon: { fontSize: 16, marginRight: 8 },
  viewTemplatesButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  
  // Toggle buttons
  toggleContainer: { flexDirection: 'row', padding: 16, paddingBottom: 8, gap: 8 },
  toggleButton: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  toggleButtonActive: { backgroundColor: '#3B82F6' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  toggleTextActive: { color: '#fff' },
  
  list: { flex: 1, paddingHorizontal: 16 },
  
  // Sección para crear nueva rutina
  createRoutineSection: { marginBottom: 16 },
  createNewRoutineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  createNewRoutineIcon: { fontSize: 20, marginRight: 12 },
  createNewRoutineTextContainer: { flex: 1 },
  createNewRoutineTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  createNewRoutineSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  createNewRoutineArrow: { fontSize: 18, color: '#3B82F6', fontWeight: 'bold' },
  
  // Empty state mejorado
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, color: '#1F2937', fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  emptyButton: { backgroundColor: '#3B82F6', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  emptyButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  // Group cards
  groupCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    borderLeftWidth: 4, 
    borderLeftColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
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
  
  // Client cards mejoradas
  clientCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 18, 
    marginBottom: 16, 
    borderLeftWidth: 4, 
    borderLeftColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  clientHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  clientAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  clientAvatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 17, fontWeight: 'bold', color: '#1F2937' },
  clientEmail: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  clientPhone: { fontSize: 14, color: '#10B981', marginTop: 1, fontWeight: '500' },
  routineCount: { backgroundColor: '#DCFCE7', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center' },
  routineCountText: { fontSize: 22, fontWeight: 'bold', color: '#10B981' },
  routineCountLabel: { fontSize: 10, color: '#059669', marginTop: 1 },
  
  // Botón para agregar rutina al cliente
  addRoutineToClientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  addRoutineToClientIcon: { fontSize: 16, marginRight: 10 },
  addRoutineToClientText: { flex: 1, fontSize: 14, color: '#059669', fontWeight: '600' },
  
  // Routine items
  routineItem: { 
    backgroundColor: '#F9FAFB', 
    borderRadius: 12, 
    padding: 14, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#E5E7EB' 
  },
  routineItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  routineItemName: { fontSize: 16, fontWeight: '600', color: '#1F2937', flex: 1 },
  routineItemInfo: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  
  // Badges y botones
  tipoBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  tipoBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  infoText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  deleteButton: { backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  deleteButtonText: { color: '#DC2626', fontSize: 13, fontWeight: 'bold' },
  
  // Botones antiguos (mantener para compatibilidad)
  addButton: { backgroundColor: '#3B82F6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});