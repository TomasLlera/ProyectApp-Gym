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
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📚 Plantillas</Text>
        <Text style={styles.headerSubtitle}>Selecciona una plantilla</Text>
      </View>

      <ScrollView style={styles.list}>
        {templates.map((template, index) => (
          <View key={index} style={styles.templateCard}>
            <Text style={styles.templateName}>{template.nombre}</Text>
            
            <View style={styles.templateBadges}>
              <View style={[styles.badge, { backgroundColor: getTipoColor(template.tipo) }]}>
                <Text style={styles.badgeText}>{template.tipo}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{template.nivel}</Text>
              </View>
            </View>

            <View style={styles.templateInfo}>
              <Text style={styles.infoText}>💪 {template.ejercicios?.length} ejercicios</Text>
              <Text style={styles.infoText}>⏱️ {template.duracionEstimada} min</Text>
              <Text style={styles.infoText}>📅 {template.diasSemana?.length} días</Text>
            </View>

            <View style={styles.daysContainer}>
              {template.diasSemana?.map((dia) => (
                <View key={dia} style={styles.dayChip}>
                  <Text style={styles.dayChipText}>{dia.slice(0, 3).toUpperCase()}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.useButton}
              onPress={() => selectTemplate(template)}
            >
              <Text style={styles.useButtonText}>✨ Usar Plantilla</Text>
            </TouchableOpacity>
          </View>
        ))}
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
              <TouchableOpacity onPress={() => setShowClientModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {groups.length > 0 && (
              <TouchableOpacity
                style={styles.groupButton}
                onPress={() => setShowGroupModal(true)}
              >
                <Text style={styles.groupButtonText}>👥 Seleccionar Grupo</Text>
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
                    <View style={styles.checkbox}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
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
                <Text style={styles.confirmButtonText}>
                  ✓ Crear para {selectedClients.length} cliente(s)
                </Text>
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
                <Text style={styles.modalClose}>✕</Text>
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
  header: { backgroundColor: '#fff', padding: 24, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { fontSize: 16, color: '#3B82F6', marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#6B7280' },
  list: { flex: 1, padding: 16 },
  templateCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  templateName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  templateBadges: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  templateInfo: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  infoText: { fontSize: 12, color: '#6B7280' },
  daysContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  dayChip: { backgroundColor: '#E0E7FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  dayChipText: { color: '#3730A3', fontSize: 10, fontWeight: 'bold' },
  useButton: { backgroundColor: '#8B5CF6', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  useButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  modalClose: { fontSize: 28, color: '#6B7280' },
  groupButton: { backgroundColor: '#8B5CF6', margin: 16, marginBottom: 8, padding: 14, borderRadius: 12, alignItems: 'center' },
  groupButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  clientItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center' },
  clientItemSelected: { backgroundColor: '#EEF2FF' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#3B82F6', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkmark: { color: '#3B82F6', fontSize: 16, fontWeight: 'bold' },
  clientName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  clientEmail: { fontSize: 13, color: '#6B7280' },
  emptyText: { textAlign: 'center', color: '#6B7280', fontSize: 14, paddingVertical: 40 },
  confirmButton: { backgroundColor: '#10B981', margin: 16, marginTop: 8, padding: 16, borderRadius: 12, alignItems: 'center' },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  groupItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  groupName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  groupCount: { fontSize: 13, color: '#8B5CF6' },
});