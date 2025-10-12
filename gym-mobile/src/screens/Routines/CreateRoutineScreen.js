// src/screens/Routines/CreateRoutineScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { routinesAPI, clientsAPI } from '../../api/axios';

export default function CreateRoutineScreen({ navigation }) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'personalizado',
    nivel: 'principiante',
    diasSemana: [],
    duracionEstimada: '60',
  });

  const [ejercicios, setEjercicios] = useState([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]); // 🔥 CAMBIADO a array
  const [groups, setGroups] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Ejercicio temporal para agregar
  const [newExercise, setNewExercise] = useState({
    nombre: '',
    series: '3',
    repeticiones: '10-12',
    peso: 'A definir',
    descanso: '60 seg',
    grupoMuscular: 'pecho',
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const clientsRes = await clientsAPI.getAll({ limit: 100 });
      setClients(clientsRes.data.data.clients);
      
      // Intentar cargar grupos
      try {
        const groupsRes = await groupsAPI.getAll();
        setGroups(groupsRes.data.data.groups || []);
      } catch (groupError) {
        console.log('No hay grupos disponibles');
        setGroups([]);
      }
    } catch (error) {
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
    setSelectedClients(group.clientes.map(c => c._id));
    setShowGroupModal(false);
  };

  const toggleDay = (day) => {
    const days = [...formData.diasSemana];
    const index = days.indexOf(day);
    if (index > -1) {
      days.splice(index, 1);
    } else {
      days.push(day);
    }
    setFormData({ ...formData, diasSemana: days });
  };

  const addExercise = () => {
    if (!newExercise.nombre.trim()) {
      Alert.alert('Error', 'El nombre del ejercicio es requerido');
      return;
    }

    setEjercicios([
      ...ejercicios,
      { ...newExercise, orden: ejercicios.length }
    ]);

    // Reset form
    setNewExercise({
      nombre: '',
      series: '3',
      repeticiones: '10-12',
      peso: 'A definir',
      descanso: '60 seg',
      grupoMuscular: 'pecho',
    });
    setShowExerciseModal(false);
  };

  const removeExercise = (index) => {
    Alert.alert(
      'Eliminar ejercicio',
      '¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const updated = ejercicios.filter((_, i) => i !== index);
            setEjercicios(updated);
          }
        }
      ]
    );
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'El nombre de la rutina es requerido');
      return;
    }
    if (selectedClients.length === 0) {
      Alert.alert('Error', 'Debes seleccionar al menos un cliente');
      return;
    }
    if (formData.diasSemana.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un día de entrenamiento');
      return;
    }
    if (ejercicios.length === 0) {
      Alert.alert('Error', 'Debes agregar al menos un ejercicio');
      return;
    }

    setLoading(true);
    try {
      await routinesAPI.create({
        clienteIds: selectedClients, // 🔥 ARRAY de clientes
        ...formData,
        duracionEstimada: parseInt(formData.duracionEstimada),
        ejercicios,
      });

      Alert.alert(
        'Éxito', 
        `Rutina creada para ${selectedClients.length} cliente(s)`, 
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo crear la rutina');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva Rutina</Text>
      </View>

      <ScrollView style={styles.form}>
        {/* Cliente */}
        <View style={styles.section}>
          <Text style={styles.label}>Clientes * ({selectedClients.length} seleccionados)</Text>
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => setShowClientModal(true)}
          >
            <Text style={styles.selectButtonText}>
              {selectedClients.length > 0
                ? `${selectedClients.length} cliente(s) seleccionado(s)`
                : 'Seleccionar clientes'
              }
            </Text>
          </TouchableOpacity>
        </View>

        {/* Nombre */}
        <View style={styles.section}>
          <Text style={styles.label}>Nombre de la rutina *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Rutina Full Body"
            value={formData.nombre}
            onChangeText={(text) => setFormData({ ...formData, nombre: text })}
          />
        </View>

        {/* Descripción */}
        <View style={styles.section}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Descripción opcional"
            value={formData.descripcion}
            onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Tipo */}
        <View style={styles.section}>
          <Text style={styles.label}>Tipo de rutina *</Text>
          <View style={styles.chipContainer}>
            {['fuerza', 'hipertrofia', 'cardio', 'resistencia', 'funcional', 'personalizado'].map((tipo) => (
              <TouchableOpacity
                key={tipo}
                style={[styles.chip, formData.tipo === tipo && styles.chipActive]}
                onPress={() => setFormData({ ...formData, tipo })}
              >
                <Text style={[styles.chipText, formData.tipo === tipo && styles.chipTextActive]}>
                  {tipo}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Nivel */}
        <View style={styles.section}>
          <Text style={styles.label}>Nivel *</Text>
          <View style={styles.chipContainer}>
            {['principiante', 'intermedio', 'avanzado'].map((nivel) => (
              <TouchableOpacity
                key={nivel}
                style={[styles.chip, formData.nivel === nivel && styles.chipActive]}
                onPress={() => setFormData({ ...formData, nivel })}
              >
                <Text style={[styles.chipText, formData.nivel === nivel && styles.chipTextActive]}>
                  {nivel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Días de la semana */}
        <View style={styles.section}>
          <Text style={styles.label}>Días de entrenamiento *</Text>
          <View style={styles.chipContainer}>
            {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map((dia) => (
              <TouchableOpacity
                key={dia}
                style={[styles.chip, formData.diasSemana.includes(dia) && styles.chipActive]}
                onPress={() => toggleDay(dia)}
              >
                <Text style={[styles.chipText, formData.diasSemana.includes(dia) && styles.chipTextActive]}>
                  {dia.slice(0, 3).toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Duración */}
        <View style={styles.section}>
          <Text style={styles.label}>Duración estimada (minutos) *</Text>
          <TextInput
            style={styles.input}
            placeholder="60"
            value={formData.duracionEstimada}
            onChangeText={(text) => setFormData({ ...formData, duracionEstimada: text })}
            keyboardType="numeric"
          />
        </View>

        {/* Ejercicios */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Ejercicios ({ejercicios.length})</Text>
            <TouchableOpacity
              style={styles.addExerciseButton}
              onPress={() => setShowExerciseModal(true)}
            >
              <Text style={styles.addExerciseButtonText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>

          {ejercicios.length === 0 ? (
            <Text style={styles.emptyText}>No hay ejercicios agregados</Text>
          ) : (
            ejercicios.map((ej, index) => (
              <View key={index} style={styles.exerciseItem}>
                <View style={styles.exerciseNumber}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{ej.nombre}</Text>
                  <Text style={styles.exerciseDetails}>
                    {ej.series}x{ej.repeticiones} • {ej.peso} • {ej.descanso}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeExercise(index)}>
                  <Text style={styles.removeButton}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creando...' : 'Crear Rutina'}
          </Text>
        </TouchableOpacity>
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
                style={styles.groupSelectButton}
                onPress={() => setShowGroupModal(true)}
              >
                <Text style={styles.groupSelectButtonText}>👥 Seleccionar Grupo</Text>
              </TouchableOpacity>
            )}

            <FlatList
              data={clients}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => {
                const isSelected = selectedClients.includes(item._id);
                return (
                  <TouchableOpacity
                    style={[styles.clientItem, isSelected && styles.clientItemSelected]}
                    onPress={() => toggleClient(item._id)}
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
            />

            {selectedClients.length > 0 && (
              <TouchableOpacity 
                style={styles.confirmClientButton} 
                onPress={() => setShowClientModal(false)}
              >
                <Text style={styles.confirmClientButtonText}>
                  ✓ Confirmar {selectedClients.length} cliente(s)
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

      {/* Add Exercise Modal */}
      <Modal
        visible={showExerciseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExerciseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar Ejercicio</Text>
              <TouchableOpacity onPress={() => setShowExerciseModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.exerciseForm}>
              <Text style={styles.label}>Nombre del ejercicio *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Press de banca"
                value={newExercise.nombre}
                onChangeText={(text) => setNewExercise({ ...newExercise, nombre: text })}
              />

              <Text style={styles.label}>Grupo muscular</Text>
              <View style={styles.chipContainer}>
                {['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'abdominales', 'cardio', 'fullbody'].map((grupo) => (
                  <TouchableOpacity
                    key={grupo}
                    style={[styles.chip, newExercise.grupoMuscular === grupo && styles.chipActive]}
                    onPress={() => setNewExercise({ ...newExercise, grupoMuscular: grupo })}
                  >
                    <Text style={[styles.chipText, newExercise.grupoMuscular === grupo && styles.chipTextActive]}>
                      {grupo}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Series</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="3"
                    value={newExercise.series}
                    onChangeText={(text) => setNewExercise({ ...newExercise, series: text })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Repeticiones</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10-12"
                    value={newExercise.repeticiones}
                    onChangeText={(text) => setNewExercise({ ...newExercise, repeticiones: text })}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Peso</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10kg"
                    value={newExercise.peso}
                    onChangeText={(text) => setNewExercise({ ...newExercise, peso: text })}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Descanso</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="60 seg"
                    value={newExercise.descanso}
                    onChangeText={(text) => setNewExercise({ ...newExercise, descanso: text })}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.addButton} onPress={addExercise}>
                <Text style={styles.addButtonText}>✓ Agregar Ejercicio</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#fff', padding: 24, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { fontSize: 16, color: '#EF4444', marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  form: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  textArea: { height: 80, textAlignVertical: 'top' },
  selectButton: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  selectButtonText: { fontSize: 16, color: '#6B7280' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#fff' },
  addExerciseButton: { backgroundColor: '#3B82F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addExerciseButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, paddingVertical: 20 },
  exerciseItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8 },
  exerciseNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  exerciseNumberText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  exerciseDetails: { fontSize: 12, color: '#6B7280' },
  removeButton: { fontSize: 20, padding: 4 },
  submitButton: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginVertical: 24 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  modalClose: { fontSize: 28, color: '#6B7280' },
  clientItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center' },
  clientItemSelected: { backgroundColor: '#EEF2FF' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#3B82F6', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkmark: { color: '#3B82F6', fontSize: 16, fontWeight: 'bold' },
  clientName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  clientEmail: { fontSize: 13, color: '#6B7280' },
  groupSelectButton: { backgroundColor: '#8B5CF6', margin: 16, marginBottom: 8, padding: 14, borderRadius: 12, alignItems: 'center' },
  groupSelectButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  confirmClientButton: { backgroundColor: '#10B981', margin: 16, marginTop: 8, padding: 16, borderRadius: 12, alignItems: 'center' },
  confirmClientButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  groupItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  groupName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  groupCount: { fontSize: 13, color: '#8B5CF6' },
  exerciseForm: { padding: 20 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  addButton: { backgroundColor: '#10B981', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  addButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});