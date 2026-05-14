// src/screens/Routines/RoutineTemplatesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../../context/DatabaseContext';

export default function RoutineTemplatesScreen({ navigation }) {
  const { routines, clients } = useDatabase();
  
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [clientsList, setClientsList] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [groups, setGroups] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      // Obtener todas las rutinas y filtrar las que son plantillas (sin cliente)
      const allRoutines = await routines.getAll();
      const templatesList = allRoutines.filter(routine => !routine.clienteId);
      
      // Cargar ejercicios para cada plantilla
      const templatesWithExercises = await Promise.all(
        templatesList.map(async (template) => {
          try {
            const fullTemplate = await routines.getById(template.id);
            return fullTemplate;
          } catch (error) {
            console.warn(`Error cargando ejercicios para plantilla ${template.id}:`, error);
            return template; // Devolver plantilla sin ejercicios si hay error
          }
        })
      );
      
      setTemplates(templatesWithExercises);
    } catch (error) {
      console.error('Error loading templates:', error);
      Alert.alert('Error', 'No se pudieron cargar las plantillas');
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = async (template) => {
    setSelectedTemplate(template);
    setSelectedClients([]);
    try {
      // Cargar clientes
      const clientsData = await clients.getAll();
      setClientsList(clientsData);
      
      // Cargar grupos
      try {
        const groupsData = await routines.getGrouped();
        setGroups(groupsData);
      } catch (groupError) {
        console.log('No se pudieron cargar grupos (opcional):', groupError);
        setGroups([]);
      }
      
      setShowClientModal(true);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      Alert.alert('Error', 'No se pudieron cargar los clientes');
    }
  };

  const toggleClient = (clientId) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter(id => id !== clientId));
    } else {
      setSelectedClients([...selectedClients, clientId]);
    }
  };

  const selectGroup = (group) => {
    setSelectedClients(group.clientes.map(c => c.id || c._id));
    setShowGroupModal(false);
  };

  const assignTemplate = async () => {
    if (selectedClients.length === 0) {
      Alert.alert('Error', 'Debes seleccionar al menos un cliente');
      return;
    }

    try {
      const routineData = {
        nombre: selectedTemplate.nombre,
        descripcion: selectedTemplate.descripcion || '',
        tipo: selectedTemplate.tipo,
        nivel: selectedTemplate.nivel,
        diasSemana: selectedTemplate.diasSemana || [],
        duracionEstimada: selectedTemplate.duracionEstimada || 60,
        ejercicios: selectedTemplate.ejercicios.map((ej, index) => ({
          nombre: ej.nombre,
          descripcion: ej.descripcion || '',
          series: ej.series,
          repeticiones: ej.repeticiones,
          peso: ej.peso || 'A definir',
          descanso: ej.descanso || '60 seg',
          grupoMuscular: ej.grupoMuscular,
          notas: ej.notas || '',
          orden: ej.orden !== undefined ? ej.orden : index
        }))
      };

      // Crear rutina para cada cliente seleccionado
      for (const clienteId of selectedClients) {
        await routines.create(clienteId, routineData);
      }
      
      Alert.alert(
        'Éxito', 
        `✅ Rutina creada para ${selectedClients.length} cliente(s)`, 
        [{ text: 'OK', onPress: () => {
          setShowClientModal(false);
          navigation.goBack();
        }}]
      );
    } catch (error) {
      console.error('❌ Error:', error);
      Alert.alert('Error', 'No se pudo crear la rutina');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="copy-outline" size={48} color="#F97316" style={{ marginBottom: 14 }} />
        <Text style={styles.loadingText}>Cargando plantillas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonRow} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#F97316" />
          <Text style={styles.backButton}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plantillas</Text>
        <Text style={styles.headerSubtitle}>Selecciona una plantilla</Text>
      </View>

      <ScrollView style={styles.list}>
        {templates.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="copy-outline" size={64} color="#3F3F46" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>No hay plantillas</Text>
            <Text style={styles.emptySubtext}>Crea una plantilla para asignar rutinas a tus clientes</Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => navigation.navigate('CreateTemplate')}
            >
              <Ionicons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.createBtnText}>Nueva Plantilla</Text>
            </TouchableOpacity>
          </View>
        )}
        {templates.map((template, index) => {
          const tipoColor = getTipoColor(template.tipo);
          return (
            <View key={index} style={[styles.templateCard, { borderLeftColor: tipoColor }]}>
              {/* Header */}
              <View style={styles.templateHeader}>
                <Text style={styles.templateName}>{template.nombre}</Text>
                <View style={[styles.badge, { backgroundColor: tipoColor + '25', borderColor: tipoColor + '60' }]}>
                  <Text style={[styles.badgeText, { color: tipoColor }]}>{template.tipo?.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.templateSubRow}>
                <View style={styles.nivelBadge}>
                  <Text style={styles.nivelBadgeText}>{template.nivel?.toUpperCase()}</Text>
                </View>
              </View>

              {/* Stats */}
              <View style={styles.templateStats}>
                <View style={styles.statItem}>
                  <Ionicons name="barbell-outline" size={13} color="#71717A" />
                  <Text style={styles.statText}>{template.ejercicios?.length || 0} ejerc.</Text>
                </View>
                <View style={styles.statDot} />
                <View style={styles.statItem}>
                  <Ionicons name="timer-outline" size={13} color="#71717A" />
                  <Text style={styles.statText}>{template.duracionEstimada} min</Text>
                </View>
                <View style={styles.statDot} />
                <View style={styles.statItem}>
                  <Ionicons name="calendar-outline" size={13} color="#71717A" />
                  <Text style={styles.statText}>{template.diasSemana?.length || 0} días/sem</Text>
                </View>
              </View>

              {/* Days */}
              <View style={styles.daysContainer}>
                {template.diasSemana?.map((dia) => (
                  <View key={dia} style={styles.dayChip}>
                    <Text style={styles.dayChipText}>{dia.slice(0, 3).toUpperCase()}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={[styles.useButton, { backgroundColor: tipoColor }]} onPress={() => selectTemplate(template)}>
                <Ionicons name="flash-outline" size={16} color="#fff" />
                <Text style={styles.useButtonText}>Usar Plantilla</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Client Selection Modal */}
      <Modal
        visible={showClientModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowClientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Seleccionar Clientes ({selectedClients.length})
              </Text>
              <TouchableOpacity onPress={() => setShowClientModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </TouchableOpacity>
            </View>

            {groups.length > 0 && (
              <TouchableOpacity
                style={styles.groupButton}
                onPress={() => setShowGroupModal(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="people-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.groupButtonText}>Seleccionar Grupo</Text>
                </View>
              </TouchableOpacity>
            )}

            <FlatList
              data={clientsList}
              keyExtractor={(item) => item.id || item._id}
              renderItem={({ item }) => {
                const isSelected = selectedClients.includes(item.id || item._id);
                return (
                  <TouchableOpacity
                    style={[styles.clientItem, isSelected && styles.clientItemSelected]}
                    onPress={() => toggleClient(item.id || item._id)}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#F97316" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientName}>
                        {item.nombre} {item.apellido}
                      </Text>
                      <Text style={styles.clientEmail}>{item.email}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No hay clientes</Text>
              }
            />

            {selectedClients.length > 0 && (
              <TouchableOpacity style={styles.confirmButton} onPress={assignTemplate}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.confirmButtonText}>Crear para {selectedClients.length} cliente(s)</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Group Selection Modal */}
      <Modal
        visible={showGroupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Grupo</Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={groups}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.groupItem}
                  onPress={() => selectGroup(item)}
                >
                  <Text style={styles.groupName}>{item.nombre}</Text>
                  <Text style={styles.groupCount}>
                    {item.clientes?.length || 0} cliente(s)
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No hay grupos creados</Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => navigation.navigate('CreateTemplate')}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
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
    personalizado: '#F97316'  // Naranja O2 para personalizado
  };
  return colors[tipo] || colors.personalizado;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F0F' },
  loadingText: { fontSize: 16, color: '#A1A1AA', fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#F5F5F5', marginBottom: 8, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#71717A', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F97316', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, borderColor: '#EA6C0A',
    shadowColor: '#F97316', shadowOpacity: 0.35, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  header: {
    backgroundColor: '#1A1A1A',  // Negro O2
    padding: 24, 
    paddingTop: 48, 
    borderBottomWidth: 3, 
    borderBottomColor: '#F97316',  // Naranja O2
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButtonRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backButton: { fontSize: 16, color: '#F97316', fontWeight: '600', marginLeft: 2 },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#FFFFFF', 
    marginBottom: 4 
  },
  headerSubtitle: { fontSize: 14, color: '#F97316' },  // Naranja claro
  list: { flex: 1, padding: 16 },
  templateCard: {
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
  templateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  templateName: { fontSize: 17, fontWeight: '800', color: '#F5F5F5', flex: 1, marginRight: 10 },
  templateSubRow: { marginBottom: 12 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  nivelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  nivelBadgeText: { fontSize: 10, fontWeight: '700', color: '#71717A', letterSpacing: 0.4 },
  templateStats: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: '#71717A', fontWeight: '500' },
  statDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#3F3F46' },
  daysContainer: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
  dayChip: {
    backgroundColor: '#431407',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F97316',
  },
  dayChipText: { color: '#EA6C0A', fontSize: 10, fontWeight: '700' },
  useButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  useButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(26, 26, 26, 0.7)',  // Overlay oscuro
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: '#1C1C1E', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    maxHeight: '80%',
    borderTopWidth: 4,
    borderTopColor: '#F97316',  // Borde superior naranja
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 2, 
    borderBottomColor: '#2C2C2E'
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#F5F5F5'  // Negro O2
  },
  groupButton: { 
    backgroundColor: '#2A2A2A',  // Gris oscuro
    margin: 16, 
    marginBottom: 8, 
    padding: 14, 
    borderRadius: 12, 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F97316',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  groupButtonText: { 
    color: '#FFFFFF', 
    fontSize: 15, 
    fontWeight: 'bold' 
  },
  clientItem: { 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#2C2C2E',
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  clientItemSelected: { backgroundColor: '#431407' },  // Naranja muy suave
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#3F3F46',
    marginRight: 12, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#2C2C2E',
  },
  checkboxSelected: { borderColor: '#F97316', backgroundColor: '#431407' },
  clientName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#F5F5F5',  // Negro O2
    marginBottom: 4 
  },
  clientEmail: { fontSize: 13, color: '#A1A1AA' },
  emptyText: { 
    textAlign: 'center', 
    color: '#A1A1AA', 
    fontSize: 14, 
    paddingVertical: 40 
  },
  confirmButton: { 
    backgroundColor: '#F97316',  // Naranja O2
    margin: 16, 
    marginTop: 8, 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EA6C0A',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  groupItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E'
  },
  groupName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#F5F5F5',  // Negro O2
    marginBottom: 4 
  },
  groupCount: {
    fontSize: 13,
    color: '#F97316'
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