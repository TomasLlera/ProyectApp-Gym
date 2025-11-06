// src/screens/Routines/CreateTemplateScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useDatabase } from '../../context/DatabaseContext';

export default function CreateTemplateScreen({ navigation }) {
  const { routines } = useDatabase();
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'personalizado',
    nivel: 'principiante',
    diasSemana: [],
    duracionEstimada: '60',
  });

  const [ejercicios, setEjercicios] = useState([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newExercise, setNewExercise] = useState({
    nombre: '',
    series: '3',
    repeticiones: '10-12',
    peso: 'A definir',
    descanso: '60 seg',
    grupoMuscular: 'pecho',
  });

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
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'El nombre de la plantilla es requerido');
      return;
    }
    if (formData.diasSemana.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un día');
      return;
    }
    if (ejercicios.length === 0) {
      Alert.alert('Error', 'Debes agregar al menos un ejercicio');
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Creando plantilla:', {
        nombre: formData.nombre,
        diasSemana: formData.diasSemana,
        ejercicios: ejercicios.length,
        duracionEstimada: parseInt(formData.duracionEstimada)
      });

      // Guardar como plantilla (rutina sin cliente)
      const result = await routines.create(null, {
        ...formData,
        duracionEstimada: parseInt(formData.duracionEstimada),
        ejercicios,
      });

      console.log('✅ Plantilla creada exitosamente:', result);
      Alert.alert('Éxito', '✅ Plantilla creada', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('❌ Error completo:', error);
      Alert.alert('Error', `No se pudo crear la plantilla: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva Plantilla</Text>
        <Text style={styles.headerSubtitle}>Crea ejercicios sin asignar a clientes</Text>
      </View>

      <ScrollView style={styles.form}>
        {/* Nombre */}
        <View style={styles.section}>
          <Text style={styles.label}>Nombre de la plantilla *</Text>
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

        {/* Días */}
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

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creando...' : 'Guardar Plantilla'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

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
    color: '#FFFFFF', 
    marginBottom: 4 
  },
  headerSubtitle: { fontSize: 13, color: '#FF8456' },  // Naranja claro
  form: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    padding: 14, 
    fontSize: 16, 
    borderWidth: 2, 
    borderColor: '#E5E7EB',
    color: '#1A1A1A',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { 
    paddingVertical: 8, 
    paddingHorizontal: 14, 
    borderRadius: 20, 
    backgroundColor: '#F3F4F6', 
    borderWidth: 2, 
    borderColor: '#E5E7EB' 
  },
  chipActive: { 
    backgroundColor: '#FF6B35',  // Naranja O2
    borderColor: '#E55A2B' 
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#FFFFFF' },
  addExerciseButton: { 
    backgroundColor: '#FF6B35',  // Naranja O2
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E55A2B',
  },
  addExerciseButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, paddingVertical: 20 },
  exerciseItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',  // Naranja O2
    borderWidth: 1,
    borderColor: '#FFE5DC',
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
  exerciseNumberText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  exerciseInfo: { flex: 1 },
  exerciseName: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#1A1A1A',  // Negro O2
    marginBottom: 2 
  },
  exerciseDetails: { fontSize: 12, color: '#6B7280' },
  removeButton: { fontSize: 20, padding: 4 },
  submitButton: { 
    backgroundColor: '#FF6B35',  // Naranja O2
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginVertical: 24,
    borderWidth: 2,
    borderColor: '#E55A2B',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(26, 26, 26, 0.7)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    maxHeight: '80%',
    borderTopWidth: 4,
    borderTopColor: '#FF6B35',  // Naranja O2
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
  modalClose: { fontSize: 28, color: '#6B7280' },
  exerciseForm: { padding: 20 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  addButton: { 
    backgroundColor: '#FF6B35',  // Naranja O2
    padding: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#E55A2B',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
});