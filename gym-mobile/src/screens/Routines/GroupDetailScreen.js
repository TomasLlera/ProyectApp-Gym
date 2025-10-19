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
import { routinesAPI, clientsAPI, calendarAPI } from '../../api/axios';

export default function GroupDetailScreen({ route, navigation }) {
  const { group: initialGroup } = route.params;
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
      const { data } = await routinesAPI.getGrouped();
      const updatedGroup = data.data.groups.find(g => g.nombre === group.nombre);
      
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
      const { data } = await clientsAPI.getAll({ limit: 100 });
      
      // Filtrar clientes que NO están en el grupo
      const clientsInGroup = group.clientes.map(c => c._id);
      const filtered = data.data.clients.filter(c => !clientsInGroup.includes(c._id));
      
      setAvailableClients(filtered);
      setShowAddClientModal(true);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  const addClientToGroup = async (clientId) => {
    try {
      await routinesAPI.addClientToGroup({
        routineId: group.routineId,
        clienteId: clientId
      });
      
      Alert.alert('Éxito', 'Cliente agregado al grupo');
      setShowAddClientModal(false);
      refreshGroup();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'No se pudo agregar el cliente');
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
              // Buscar y eliminar la rutina específica de este cliente
              const { data } = await routinesAPI.getAll({ clienteId: cliente._id });
              const routineToDelete = data.data.routines.find(r => r.nombre === group.nombre);
              
              if (routineToDelete) {
                await routinesAPI.delete(routineToDelete._id);
                Alert.alert('Éxito', 'Cliente quitado del grupo');
                refreshGroup();
              }
            } catch (error) {
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
              // Obtener todas las rutinas del grupo
              const { data } = await routinesAPI.getAll();
              const routinesToDelete = data.data.routines.filter(r => r.nombre === group.nombre);
              
              // Eliminar todas
              await Promise.all(routinesToDelete.map(r => routinesAPI.delete(r._id)));
              
              Alert.alert('Éxito', 'Grupo eliminado', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el grupo');
            }
          }
        }
      ]
    );
  };

  const subirTodoACalendar = async () => {
    // Si el array de clientes está vacío pero la cantidad dice que hay clientes,
    // usar una implementación alternativa
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
              // Validar que el primer cliente existe y tiene _id
              const primerCliente = group.clientes[0];
              if (!primerCliente || !primerCliente._id) {
                throw new Error('Cliente no válido en el grupo');
              }
              
              const response = await calendarAPI.subirTodas(primerCliente._id);
              
              Alert.alert(
                '✅ Éxito',
                `${response.data.totalEventos} eventos creados en Google Calendar\n\n` +
                `${response.data.detalles.map(d => `${d.rutina}: ${d.eventos || 0} eventos`).join('\n')}`
              );
            } catch (error) {
              console.error('Error:', error);
              Alert.alert(
                '❌ Error',
                error.response?.data?.error || 'No se pudieron subir las rutinas'
              );
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
      // Usar el routineId del grupo para subir
      const response = await calendarAPI.subirRutina(group.routineId);
      
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
            group.clientes.map((cliente) => (
              <View key={cliente._id} style={styles.clientCard}>
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
            <View key={index} style={styles.exerciseCard}>
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
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalClientItem}
                  onPress={() => addClientToGroup(item._id)}
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
  header: { backgroundColor: '#fff', padding: 24, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { fontSize: 16, color: '#3B82F6', marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  headerBadges: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#6B7280' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  headerSubtitle: { fontSize: 14, color: '#6B7280' },
  actions: { flexDirection: 'row', padding: 16, gap: 8 },
  actionBtn: { padding: 14, borderRadius: 12, alignItems: 'center', paddingHorizontal: 20 },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  content: { flex: 1 },
  section: { backgroundColor: '#fff', margin: 16, marginTop: 0, padding: 16, borderRadius: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  clientCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, marginBottom: 8 },
  clientAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  clientAvatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  clientEmail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  removeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  removeButtonText: { color: '#DC2626', fontSize: 18, fontWeight: 'bold' },
  infoRow: { marginBottom: 16 },
  infoLabel: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  infoValue: { fontSize: 16, color: '#1F2937', fontWeight: '600' },
  daysContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dayChip: { backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  dayChipText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  exerciseCard: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 8 },
  exerciseNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  exerciseNumberText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  exerciseContent: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  exerciseDetails: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  grupoMuscular: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  grupoMuscularText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  warningBox: { backgroundColor: '#FEF3C7', margin: 16, marginTop: 0, padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  warningText: { fontSize: 13, color: '#92400E', lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  modalClose: { fontSize: 28, color: '#6B7280' },
  modalClientItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalClientName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  modalClientEmail: { fontSize: 13, color: '#6B7280' },
  emptyText: { textAlign: 'center', color: '#6B7280', fontSize: 14, paddingVertical: 40 },
});