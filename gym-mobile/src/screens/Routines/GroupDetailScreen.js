// src/screens/Routines/GroupDetailScreen.js
import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useDatabase } from '../../context/DatabaseContext';
import { calendarAPI } from '../../api/axios';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

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
      console.log('🔐 Token agregado a la petición del grupo');
    } else {
      console.log('❌ No hay token disponible para el grupo');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default function GroupDetailScreen({ route, navigation }) {
  const { group: initialGroup } = route.params;
  const { routines, clients } = useDatabase();
  
  const [group, setGroup] = useState(initialGroup);
  const [loading, setLoading] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [availableClients, setAvailableClients] = useState([]);
  const [uploadingCalendar, setUploadingCalendar] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      refreshGroup();
    }, [])
  );

  const refreshGroup = async () => {
    try {
      const groups = await routines.getGrouped();
      const updatedGroup = groups.find(g => g.nombre === group.nombre);
      
      if (updatedGroup) {
        setGroup(updatedGroup);
      }
    } catch (error) {
      console.error('Error refreshing group:', error);
    }
  };

  const openAddClientModal = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando clientes para modal...');
      
      const allClients = await clients.getAll();
      console.log('✅ Clientes cargados:', allClients.length);
      
      // Filtrar clientes que NO están en el grupo (manejo seguro de clientes)
      const clientsInGroup = (group.clientes || []).map(c => c.id || c._id || c.clienteId);
      const filtered = allClients.filter(c => {
        const clientId = c.id || c._id;
        return clientId && !clientsInGroup.includes(clientId);
      });
      
      console.log('✅ Clientes disponibles:', filtered.length);
      setAvailableClients(filtered);
      setShowAddClientModal(true);
    } catch (error) {
      console.error('❌ Error cargando clientes:', error);
      Alert.alert('Error', `No se pudieron cargar los clientes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addClientToGroup = async (clientId) => {
    try {
      console.log('🔄 Agregando cliente al grupo:', clientId);
      
      // Obtener todas las rutinas del grupo para usar como plantilla
      const allRoutines = await routines.getAll();
      console.log('✅ Rutinas cargadas:', allRoutines.length);
      
      const templateRoutine = allRoutines.find(r => 
        r.nombre === group.nombre && r.clienteId !== null
      );
      
      if (!templateRoutine) {
        Alert.alert('Error', 'No se encontró la plantilla del grupo');
        return;
      }

      console.log('✅ Plantilla encontrada:', templateRoutine.id);

      // Obtener los ejercicios de la rutina plantilla
      const templateWithExercises = await routines.getById(templateRoutine.id);
      console.log('✅ Ejercicios cargados:', templateWithExercises.ejercicios?.length || 0);

      // Crear una nueva rutina para el cliente usando la plantilla completa
      const newRoutineData = {
        nombre: templateWithExercises.nombre,
        descripcion: templateWithExercises.descripcion,
        tipo: templateWithExercises.tipo,
        nivel: templateWithExercises.nivel,
        duracionMinutos: templateWithExercises.duracionMinutos || templateWithExercises.duracionEstimada,
        objetivos: templateWithExercises.objetivos,
        diasSemana: templateWithExercises.diasSemana || [],
        ejercicios: templateWithExercises.ejercicios || [],
        activa: true
      };

      const result = await routines.create(clientId, newRoutineData);
      console.log('✅ Rutina creada para cliente:', result.id);
      
      Alert.alert('Éxito', 'Cliente agregado al grupo');
      setShowAddClientModal(false);
      refreshGroup();
    } catch (error) {
      console.error('❌ Error agregando cliente al grupo:', error);
      Alert.alert('Error', `No se pudo agregar el cliente al grupo: ${error.message}`);
    }
  };

  const removeClientFromGroup = (cliente) => {
    Alert.alert(
      'Quitar del grupo',
      `¿Eliminar rutina de ${cliente.nombre} ${cliente.apellido}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Buscar y eliminar la rutina específica de este cliente usando SQLite
              const allRoutines = await routines.getAll();
              const routineToDelete = allRoutines.find(r => 
                r.nombre === group.nombre && (r.clienteId === cliente.id || r.clienteId === cliente._id)
              );
              
              if (routineToDelete) {
                await routines.delete(routineToDelete.id);
                Alert.alert('Éxito', 'Cliente quitado del grupo');
                refreshGroup();
              } else {
                Alert.alert('Error', 'No se encontró la rutina del cliente');
              }
            } catch (error) {
              console.error('Error removing client:', error);
              Alert.alert('Error', 'No se pudo quitar el cliente');
            }
          }
        }
      ]
    );
  };

  const deleteGroup = () => {
    Alert.alert(
      'Eliminar Grupo',
      `¿Eliminar la rutina "${group.nombre}" para TODOS los ${group.cantidad} clientes?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Todo',
          style: 'destructive',
          onPress: async () => {
            try {
              // Obtener todas las rutinas del grupo usando SQLite
              const allRoutines = await routines.getAll();
              const routinesToDelete = allRoutines.filter(r => r.nombre === group.nombre);
              
              // Eliminar todas las rutinas del grupo
              for (const routine of routinesToDelete) {
                await routines.delete(routine.id);
              }
              
              Alert.alert('Éxito', 'Grupo eliminado', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              console.error('Error deleting group:', error);
              Alert.alert('Error', 'No se pudo eliminar el grupo');
            }
          }
        }
      ]
    );
  };

  const subirTodoACalendar = async () => {
    // Verificar si hay clientes en el grupo
    if (!group.clientes || group.clientes.length === 0) {
      if (group.cantidad > 0) {
        Alert.alert(
          'Subir a Google Calendar',
          `Detectamos ${group.cantidad} cliente(s) en este grupo pero necesitamos obtener sus datos.\n\n¿Continuar con la subida usando el ID del grupo?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Continuar',
              onPress: () => subirPorGrupo()
            }
          ]
        );
        return;
      } else {
        Alert.alert('Error', 'No hay clientes en este grupo');
        return;
      }
    }

    Alert.alert(
      'Subir Todas a Google Calendar',
      `¿Subir las ${group.cantidad} rutinas del grupo "${group.nombre}" a Google Calendar?\n\nSe crearán eventos para todos los clientes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Subir Todo',
          onPress: async () => {
            setUploadingCalendar(true);
            try {
              console.log('🚀 Intentando subir grupo completo...');
              
              // Validar que el primer cliente existe y tiene id
              const primerCliente = group.clientes[0];
              if (!primerCliente || (!primerCliente.id && !primerCliente._id)) {
                throw new Error('Cliente no válido en el grupo');
              }
              
              // Preparar datos completos del grupo para el servidor
              const groupData = {
                nombre: group.nombre,
                descripcion: group.descripcion,
                tipo: group.tipo,
                nivel: group.nivel,
                duracionEstimada: group.duracionEstimada,
                diasSemana: group.diasSemana,
                ejercicios: group.ejercicios,
                clientes: group.clientes,
                cantidad: group.cantidad
              };
              
              console.log('📤 Datos del grupo a enviar:', groupData);
              
              const response = await axiosInstance.post('/calendar/subir-grupo-completo', groupData);
              
              Alert.alert(
                '✅ Éxito',
                `${response.data.totalEventos} eventos creados en Google Calendar\n\n` +
                `${response.data.detalles.map(d => `${d.rutina}: ${d.eventos || 0} eventos`).join('\n')}`
              );
            } catch (error) {
              console.error('❌ Error completo:', error);
              console.error('❌ Error response:', error.response?.data);
              
              let errorMessage = 'No se pudieron subir las rutinas';
              
              if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
                errorMessage = 'No se puede conectar al servidor. Verifica que esté ejecutándose en 192.168.0.83:3000';
              } else if (error.response?.status === 500) {
                errorMessage = `Error del servidor: ${error.response?.data?.error || 'Error interno del servidor'}`;
              } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
              }
              
              Alert.alert('❌ Error', errorMessage);
            } finally {
              setUploadingCalendar(false);
            }
          }
        }
      ]
    );
  };

  const subirPorGrupo = async () => {
    setUploadingCalendar(true);
    try {
      console.log('🚀 Enviando grupo completo al servidor...');
      
      // Preparar datos completos del grupo para el servidor
      const groupData = {
        nombre: group.nombre,
        descripcion: group.descripcion,
        tipo: group.tipo,
        nivel: group.nivel,
        duracionEstimada: group.duracionEstimada,
        diasSemana: group.diasSemana,
        ejercicios: group.ejercicios,
        clientes: group.clientes,
        cantidad: group.cantidad
      };
      
      console.log('📤 Datos del grupo a enviar:', groupData);
      
      const response = await axiosInstance.post('/calendar/subir-grupo-completo', groupData);
      
      Alert.alert(
        '✅ Éxito',
        `${response.data.data.eventosCreados} eventos creados en Google Calendar`
      );
    } catch (error) {
      console.error('❌ Error completo:', error);
      console.error('❌ Error response:', error.response?.data);
      
      let errorMessage = 'No se pudo subir la rutina';
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        errorMessage = 'No se puede conectar al servidor. Verifica que esté ejecutándose en 192.168.0.83:3000';
      } else if (error.response?.status === 500) {
        errorMessage = `Error del servidor: ${error.response?.data?.error || 'Error interno del servidor'}`;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      Alert.alert('❌ Error', errorMessage);
    } finally {
      setUploadingCalendar(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{group.nombre}</Text>
        <View style={styles.headerBadges}>
          <View style={[styles.badge, { backgroundColor: getTipoColor(group.tipo) }]}>
            <Text style={styles.badgeText}>{group.tipo}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{group.nivel}</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>{group.cantidad} clientes en este grupo</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#10B981', flex: 1 }]}
          onPress={openAddClientModal}
        >
          <Text style={styles.actionBtnText}>+ Agregar Cliente</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
          onPress={subirTodoACalendar}
          disabled={uploadingCalendar}
        >
          <Text style={styles.actionBtnText}>
            {uploadingCalendar ? '⏳' : '📅'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
          onPress={deleteGroup}
        >
          <Text style={styles.actionBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Clientes del Grupo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clientes ({group.cantidad})</Text>

          
          {group.clientes?.length > 0 ? (
            group.clientes.map((cliente, index) => (
              <View key={cliente.id || cliente._id || cliente.clienteId || `client-${index}`} style={styles.clientCard}>
                <View style={styles.clientAvatar}>
                  <Text style={styles.clientAvatarText}>
                    {cliente.nombre?.charAt(0)}{cliente.apellido?.charAt(0)}
                  </Text>
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>
                    {cliente.nombre} {cliente.apellido}
                  </Text>
                  <Text style={styles.clientEmail}>{cliente.email}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeClientFromGroup(cliente)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay clientes en este grupo</Text>
          )}
        </View>

        {/* Info de la Rutina */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de la Rutina</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duración estimada</Text>
            <Text style={styles.infoValue}>⏱️ {group.duracionEstimada} minutos</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Días de entrenamiento</Text>
            <View style={styles.daysContainer}>
              {group.diasSemana?.map((dia) => (
                <View key={dia} style={styles.dayChip}>
                  <Text style={styles.dayChipText}>{dia.slice(0, 3).toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Ejercicios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Ejercicios ({group.ejercicios?.length || 0})
          </Text>

          {group.ejercicios?.sort((a, b) => a.orden - b.orden).map((ejercicio, index) => (
            <View key={ejercicio.id || ejercicio._id || `ejercicio-${index}`} style={styles.exerciseCard}>
              <View style={styles.exerciseNumber}>
                <Text style={styles.exerciseNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseContent}>
                <Text style={styles.exerciseName}>{ejercicio.nombre}</Text>
                <Text style={styles.exerciseDetails}>
                  {ejercicio.series}x{ejercicio.repeticiones} • {ejercicio.peso} • {ejercicio.descanso}
                </Text>
                <View style={[styles.grupoMuscular, { backgroundColor: getGrupoColor(ejercicio.grupoMuscular) }]}>
                  <Text style={styles.grupoMuscularText}>{ejercicio.grupoMuscular}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Para editar esta rutina, se actualizará para TODOS los {group.cantidad} clientes del grupo
          </Text>
        </View>
      </ScrollView>

      {/* Add Client Modal */}
      <Modal
        visible={showAddClientModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddClientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar Cliente al Grupo</Text>
              <TouchableOpacity onPress={() => setShowAddClientModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={availableClients}
              keyExtractor={(item) => item.id || item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalClientItem}
                  onPress={() => addClientToGroup(item.id || item._id)}
                >
                  <Text style={styles.modalClientName}>
                    {item.nombre} {item.apellido}
                  </Text>
                  <Text style={styles.modalClientEmail}>{item.email}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Todos los clientes ya están en este grupo
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
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
  header: { 
    backgroundColor: '#1A1A1A',  // Negro O2
    padding: 24, 
    paddingTop: 48, 
    borderBottomWidth: 3, 
    borderBottomColor: '#FF6B35',  // Naranja O2
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: { 
    fontSize: 16, 
    color: '#FF6B35',  // Naranja O2
    marginBottom: 12,
    fontWeight: '600',
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#FFFFFF',  // Blanco
    marginBottom: 8 
  },
  headerBadges: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  badge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12, 
    backgroundColor: '#6B7280',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: { 
    color: '#FFFFFF', 
    fontSize: 11, 
    fontWeight: 'bold', 
    textTransform: 'uppercase' 
  },
  headerSubtitle: { 
    fontSize: 14, 
    color: '#FF8456'  // Naranja claro
  },
  actions: { 
    flexDirection: 'row', 
    padding: 16, 
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  actionBtn: { 
    padding: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  actionBtnText: { 
    color: '#FFFFFF', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  content: { flex: 1 },
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
  clientCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF5F2',  // Naranja muy suave
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFD4C4',
  },
  clientAvatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#FF6B35',  // Naranja O2
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E55A2B',
  },
  clientAvatarText: { 
    color: '#FFFFFF', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  clientInfo: { flex: 1 },
  clientName: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#1A1A1A'  // Negro O2
  },
  clientEmail: { 
    fontSize: 12, 
    color: '#6B7280', 
    marginTop: 2 
  },
  removeButton: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#FEE2E2', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  removeButtonText: { 
    color: '#DC2626', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  infoRow: { marginBottom: 16 },
  infoLabel: { 
    fontSize: 14, 
    color: '#6B7280', 
    marginBottom: 8 
  },
  infoValue: { 
    fontSize: 16, 
    color: '#1A1A1A',  // Negro O2
    fontWeight: '600' 
  },
  daysContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dayChip: { 
    backgroundColor: '#FF6B35',  // Naranja O2
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E55A2B',
  },
  dayChipText: { 
    color: '#FFFFFF', 
    fontSize: 11, 
    fontWeight: 'bold' 
  },
  exerciseCard: { 
    flexDirection: 'row', 
    backgroundColor: '#F9FAFB', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  exerciseNumber: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: '#FF6B35',  // Naranja O2
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E55A2B',
  },
  exerciseNumberText: { 
    color: '#FFFFFF', 
    fontSize: 14, 
    fontWeight: 'bold' 
  },
  exerciseContent: { flex: 1 },
  exerciseName: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#1A1A1A',  // Negro O2
    marginBottom: 4 
  },
  exerciseDetails: { 
    fontSize: 12, 
    color: '#6B7280', 
    marginBottom: 6 
  },
  grupoMuscular: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  grupoMuscularText: { 
    color: '#FFFFFF', 
    fontSize: 10, 
    fontWeight: 'bold', 
    textTransform: 'uppercase' 
  },
  warningBox: { 
    backgroundColor: '#FFE5DC',  // Naranja muy claro
    margin: 16, 
    marginTop: 0, 
    padding: 16, 
    borderRadius: 12, 
    borderLeftWidth: 4, 
    borderLeftColor: '#FF6B35',  // Naranja O2
    borderWidth: 1,
    borderColor: '#FFD4C4',
  },
  warningText: { 
    fontSize: 13, 
    color: '#E55A2B',  // Naranja oscuro
    lineHeight: 18 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(26, 26, 26, 0.7)',  // Overlay oscuro
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    maxHeight: '70%',
    borderTopWidth: 4,
    borderTopColor: '#FF6B35',  // Borde superior naranja
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 2, 
    borderBottomColor: '#FFE5DC'  // Naranja muy claro
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#1A1A1A'  // Negro O2
  },
  modalClose: { 
    fontSize: 28, 
    color: '#6B7280' 
  },
  modalClientItem: { 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  modalClientName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1A1A1A',  // Negro O2
    marginBottom: 4 
  },
  modalClientEmail: { 
    fontSize: 13, 
    color: '#6B7280' 
  },
  emptyText: { 
    textAlign: 'center', 
    color: '#6B7280', 
    fontSize: 14, 
    paddingVertical: 40 
  },
});