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
import { Ionicons } from '@expo/vector-icons';
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
        <Ionicons name="barbell-outline" size={48} color="#F97316" style={{ marginBottom: 14 }} />
        <Text style={styles.loadingText}>Cargando rutinas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navigation Tabs */}
      <View style={styles.navContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navScrollContent}
        >
          {[
            { key: 'groups', label: 'Por Grupos', icon: 'people-outline' },
            { key: 'individual', label: 'Individual', icon: 'person-outline' },
          ].map(({ key, label, icon }) => (
            <TouchableOpacity
              key={key}
              style={[styles.navChip, viewMode === key && styles.navChipActive]}
              onPress={() => setViewMode(key)}
            >
              <Ionicons name={icon} size={14} color={viewMode === key ? '#FFFFFF' : '#71717A'} style={{ marginRight: 5 }} />
              <Text style={[styles.navText, viewMode === key && styles.navTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.navChip}
            onPress={() => navigation.navigate('RoutineTemplates')}
          >
            <Ionicons name="copy-outline" size={14} color="#71717A" style={{ marginRight: 5 }} />
            <Text style={styles.navText}>Plantillas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navChip}
            onPress={() => navigation.navigate('BibliotecaEjercicios')}
          >
            <Ionicons name="barbell-outline" size={14} color="#71717A" style={{ marginRight: 5 }} />
            <Text style={styles.navText}>Ejercicios</Text>
          </TouchableOpacity>
        </ScrollView>
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
                  <Ionicons name="flash-outline" size={24} color="#F97316" style={{ marginRight: 12 }} />
                  <View style={styles.createNewRoutineTextContainer}>
                    <Text style={styles.createNewRoutineTitle}>Crear Nueva Rutina</Text>
                    <Text style={styles.createNewRoutineSubtitle}>Usa una plantilla para crear rutinas rápidamente</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#F97316" />
                </TouchableOpacity>
              </View>
            )}
            
            {groups.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="barbell-outline" size={64} color="#3F3F46" style={{ marginBottom: 16 }} />
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
                  <Ionicons name="add-circle-outline" size={24} color="#F97316" style={{ marginRight: 12 }} />
                  <View style={styles.createNewRoutineTextContainer}>
                    <Text style={styles.createNewRoutineTitle}>Asignar Nueva Rutina</Text>
                    <Text style={styles.createNewRoutineSubtitle}>Crea rutinas individuales para tus clientes</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#F97316" />
                </TouchableOpacity>
              </View>
            )}
            
            {clientRoutines.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="barbell-outline" size={64} color="#3F3F46" style={{ marginBottom: 16 }} />
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
                  {/* Header compacto del cliente */}
                  <View style={styles.clientHeader}>
                    <View style={styles.clientAvatar}>
                      <Text style={styles.clientAvatarText}>
                        {clientData.cliente?.nombre?.charAt(0) || 'C'}{clientData.cliente?.apellido?.charAt(0) || 'L'}
                      </Text>
                    </View>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>
                        {clientData.cliente?.nombre || 'Cliente'} {clientData.cliente?.apellido || ''}
                      </Text>
                      {clientData.cliente?.telefono ? (
                        <View style={styles.phoneRow}>
                          <Ionicons name="call-outline" size={10} color="#25D366" />
                          <Text style={styles.clientPhone}>{clientData.cliente.telefono}</Text>
                        </View>
                      ) : (
                        <Text style={styles.clientEmail}>{clientData.cliente?.email || 'Sin email'}</Text>
                      )}
                    </View>
                    <View style={styles.routineCount}>
                      <Text style={styles.routineCountText}>{clientData.rutinas.length}</Text>
                      <Text style={styles.routineCountLabel}>rutina{clientData.rutinas.length !== 1 ? 's' : ''}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.addRoutineBtn}
                      onPress={() => navigation.navigate('RoutineTemplates', { clienteId: clientData.cliente?.id })}
                    >
                      <Ionicons name="add" size={16} color="#F97316" />
                    </TouchableOpacity>
                  </View>

                  {/* Rutinas del cliente */}
                  {clientData.rutinas.map((routine, routineIndex) => {
                    const tipoColor = getTipoColor(routine.tipo);
                    return (
                      <TouchableOpacity
                        key={routine.id || routine._id || `routine-${routineIndex}`}
                        style={[styles.routineItem, { borderLeftColor: tipoColor }]}
                        onPress={() => navigation.navigate('RoutineDetail', { routineId: routine.id || routine._id })}
                      >
                        <View style={styles.routineItemHeader}>
                          <Text style={styles.routineItemName} numberOfLines={1}>{routine.nombre}</Text>
                          <View style={[styles.tipoBadge, { backgroundColor: tipoColor + '22', borderColor: tipoColor + '60' }]}>
                            <Text style={[styles.tipoBadgeText, { color: tipoColor }]}>{routine.tipo?.toUpperCase()}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.routineDeleteBtn}
                            onPress={(e) => { e.stopPropagation(); deleteRoutine(routine.id || routine._id); }}
                          >
                            <Ionicons name="trash-outline" size={13} color="#DC2626" />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.routineStats}>
                          <View style={styles.statItem}>
                            <Ionicons name="barbell-outline" size={12} color="#71717A" />
                            <Text style={styles.statText}>{routine.ejercicios?.length || 0} ejerc.</Text>
                          </View>
                          <View style={styles.statDot} />
                          <View style={styles.statItem}>
                            <Ionicons name="timer-outline" size={12} color="#71717A" />
                            <Text style={styles.statText}>{routine.duracionEstimada} min</Text>
                          </View>
                          <View style={styles.statDot} />
                          <View style={styles.statItem}>
                            <Ionicons name="calendar-outline" size={12} color="#71717A" />
                            <Text style={styles.statText}>{routine.diasSemana?.length || 0} días/sem</Text>
                          </View>
                          <View style={{ marginLeft: 'auto' }}>
                            <Ionicons name="chevron-forward" size={14} color="#3F3F46" />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => navigation.navigate('RoutineTemplates')}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

function GroupCard({ group, onPress }) {
  const tipoColor = getTipoColor(group.tipo);

  return (
    <TouchableOpacity style={[styles.groupCard, { borderLeftColor: tipoColor }]} onPress={onPress} activeOpacity={0.75}>
      {/* Header */}
      <View style={styles.groupHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.groupName}>{group.nombre}</Text>
          <View style={styles.groupMeta}>
            <View style={[styles.tipoBadge, { backgroundColor: tipoColor + '25', borderColor: tipoColor + '60' }]}>
              <Text style={[styles.tipoBadgeText, { color: tipoColor }]}>{group.tipo?.toUpperCase()}</Text>
            </View>
            <View style={styles.nivelBadge}>
              <Text style={styles.nivelBadgeText}>{group.nivel?.toUpperCase()}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.clientCount, { borderColor: tipoColor + '60', backgroundColor: tipoColor + '18' }]}>
          <Text style={[styles.clientCountText, { color: tipoColor }]}>{group.cantidad}</Text>
          <Text style={[styles.clientCountLabel, { color: tipoColor }]}>clientes</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.groupStats}>
        <View style={styles.statItem}>
          <Ionicons name="barbell-outline" size={13} color="#71717A" />
          <Text style={styles.statText}>{group.ejercicios?.length || 0} ejerc.</Text>
        </View>
        <View style={styles.statDot} />
        <View style={styles.statItem}>
          <Ionicons name="timer-outline" size={13} color="#71717A" />
          <Text style={styles.statText}>{group.duracionEstimada} min</Text>
        </View>
        <View style={styles.statDot} />
        <View style={styles.statItem}>
          <Ionicons name="calendar-outline" size={13} color="#71717A" />
          <Text style={styles.statText}>{group.diasSemana?.length || 0} días/sem</Text>
        </View>
      </View>

      {/* Client avatars */}
      <View style={styles.clientAvatarRow}>
        {group.clientes?.slice(0, 5).map((cliente, index) => (
          <View key={index} style={[styles.miniAvatar, { marginLeft: index > 0 ? -8 : 0, zIndex: 5 - index, borderColor: tipoColor }]}>
            <Text style={styles.miniAvatarText}>
              {cliente.nombre?.charAt(0)}{cliente.apellido?.charAt(0)}
            </Text>
          </View>
        ))}
        {group.cantidad > 5 && (
          <View style={[styles.miniAvatarMore, { marginLeft: -8 }]}>
            <Text style={styles.miniAvatarMoreText}>+{group.cantidad - 5}</Text>
          </View>
        )}
        <View style={styles.chevronRight}>
          <Ionicons name="chevron-forward" size={16} color="#3F3F46" />
        </View>
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
    personalizado: '#F97316'  // Naranja O2 para personalizado
  };
  return colors[tipo] || colors.personalizado;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#A1A1AA' },
  
  // Header mejorado
  header: { 
    backgroundColor: '#1A1A1A',  // Negro O2
    padding: 20, 
    paddingTop: 48, 
    borderBottomWidth: 3,
    borderBottomColor: '#F97316',  // Naranja O2
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#FFFFFF',  // Blanco
    marginBottom: 16 
  },
  // Navigation Tabs
  navContainer: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  navScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  navChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  navChipActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  navText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717A',
  },
  navTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  
  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#EA6C0A',
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  
  
  list: { flex: 1, paddingHorizontal: 16 },
  
  // Sección para crear nueva rutina
  createRoutineSection: { marginBottom: 16, marginTop: 8 },
  createNewRoutineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F97316',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  createNewRoutineTextContainer: { flex: 1 },
  createNewRoutineTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#F5F5F5'  // Negro O2
  },
  createNewRoutineSubtitle: { 
    fontSize: 13, 
    color: '#EA6C0A',  // Naranja oscuro
    marginTop: 2 
  },
  createNewRoutineArrow: { color: '#F97316' },
  
  // Empty state mejorado
  emptyState: { 
    alignItems: 'center', 
    paddingVertical: 60, 
    paddingHorizontal: 20 
  },
  emptyText: { 
    fontSize: 18, 
    color: '#F5F5F5',  // Negro O2
    fontWeight: '600', 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  emptySubtext: { 
    fontSize: 14, 
    color: '#A1A1AA', 
    marginBottom: 24, 
    textAlign: 'center', 
    lineHeight: 20 
  },
  emptyButton: { 
    backgroundColor: '#F97316',  // Naranja O2
    paddingHorizontal: 32, 
    paddingVertical: 14, 
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EA6C0A',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  
  // Group cards
  groupCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F5F5F5',
    marginBottom: 6,
  },
  groupMeta: { flexDirection: 'row', gap: 6 },
  tipoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  tipoBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  nivelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  nivelBadgeText: { fontSize: 10, fontWeight: '700', color: '#71717A', letterSpacing: 0.4 },
  clientCount: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  clientCountText: { fontSize: 20, fontWeight: '800' },
  clientCountLabel: { fontSize: 10, marginTop: 1, fontWeight: '600' },
  groupStats: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: '#71717A', fontWeight: '500' },
  statDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#3F3F46' },
  clientAvatarRow: { flexDirection: 'row', alignItems: 'center' },
  miniAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  miniAvatarText: { fontSize: 10, fontWeight: '700', color: '#F5F5F5' },
  miniAvatarMore: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3F3F46',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2C2C2E',
  },
  miniAvatarMoreText: { fontSize: 9, fontWeight: '700', color: '#A1A1AA' },
  chevronRight: { marginLeft: 'auto' },
  
  // Client cards compactas
  clientCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    gap: 8,
  },
  clientAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EA6C0A',
  },
  clientAvatarText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 13, fontWeight: '700', color: '#F5F5F5' },
  clientEmail: { fontSize: 11, color: '#71717A', marginTop: 1 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  clientPhone: { fontSize: 11, color: '#25D366', fontWeight: '500' },
  routineCount: {
    backgroundColor: '#F9731622',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F9731660',
  },
  routineCountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F97316',
  },
  routineCountLabel: {
    fontSize: 9,
    color: '#F97316',
    fontWeight: '600',
  },
  addRoutineBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F9731618',
    borderWidth: 1,
    borderColor: '#F9731640',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Routine items
  routineItem: {
    backgroundColor: '#141414',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderLeftWidth: 3,
  },
  routineItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  routineItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F5F5F5',
    flex: 1,
  },
  routineDeleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#DC262618',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routineStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  

  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
});