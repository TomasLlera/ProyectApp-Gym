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
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../../context/DatabaseContext';
import SelectorEjerciciosModal from '../../components/SelectorEjerciciosModal';

const TIPOS = [
  { key: 'fuerza',        icon: 'barbell-outline',      color: '#EF4444', label: 'Fuerza' },
  { key: 'hipertrofia',   icon: 'fitness-outline',      color: '#8B5CF6', label: 'Hipertrofia' },
  { key: 'cardio',        icon: 'heart-outline',        color: '#F59E0B', label: 'Cardio' },
  { key: 'resistencia',   icon: 'timer-outline',        color: '#10B981', label: 'Resistencia' },
  { key: 'funcional',     icon: 'flash-outline',        color: '#3B82F6', label: 'Funcional' },
  { key: 'personalizado', icon: 'star-outline',         color: '#F97316', label: 'Personalizado' },
];
const NIVELES = [
  { key: 'principiante', icon: 'leaf-outline',        color: '#10B981', label: 'Principiante' },
  { key: 'intermedio',   icon: 'trending-up-outline', color: '#F59E0B', label: 'Intermedio' },
  { key: 'avanzado',     icon: 'flame-outline',       color: '#EF4444', label: 'Avanzado' },
];
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

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
  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTipoModal, setShowTipoModal] = useState(false);
  const [showNivelModal, setShowNivelModal] = useState(false);
  const [showDiasModal, setShowDiasModal] = useState(false);

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

  // Agregar esta nueva función para manejar la selección desde biblioteca:
  const handleSelectFromBiblioteca = (ejercicioDeBiblioteca) => {
    // Verificar si el ejercicio ya está en la plantilla
    const yaExiste = ejercicios.some(
      ej => ej.nombre.toLowerCase() === ejercicioDeBiblioteca.nombre.toLowerCase()
    );
    
    if (yaExiste) {
      Alert.alert(
        'Ejercicio duplicado',
        `"${ejercicioDeBiblioteca.nombre}" ya está agregado a esta plantilla.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Convertir ejercicio de biblioteca al formato de rutina
    const ejercicioParaRutina = {
      nombre: ejercicioDeBiblioteca.nombre,
      series: ejercicioDeBiblioteca.seriesSugeridas?.toString() || '3',
      repeticiones: ejercicioDeBiblioteca.repeticionesSugeridas || '10-12',
      peso: 'A definir',
      descanso: ejercicioDeBiblioteca.descansoSugerido || '60 seg',
      grupoMuscular: ejercicioDeBiblioteca.grupoMuscular || 'pecho',
      orden: ejercicios.length
    };
    
    setEjercicios([
      ...ejercicios,
      ejercicioParaRutina
    ]);
    setShowSelectorModal(false);
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

  const getTipoInfo = (tipo) => TIPOS.find(t => t.key === tipo) || TIPOS[5];
  const getNivelInfo = (nivel) => NIVELES.find(n => n.key === nivel) || NIVELES[0];
  const formatDias = (dias) => {
    if (!dias || dias.length === 0) return 'Seleccionar días';
    if (dias.length <= 3) return dias.map(d => d.slice(0, 3).toUpperCase()).join(' · ');
    return `${dias.length} días seleccionados`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonRow} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#F97316" />
          <Text style={styles.backButton}>Cancelar</Text>
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
          <TouchableOpacity style={styles.selectorRow} onPress={() => setShowTipoModal(true)}>
            <View style={styles.selectorLeft}>
              <View style={[styles.selectorIcon, { backgroundColor: getTipoInfo(formData.tipo).color + '22' }]}>
                <Ionicons name={getTipoInfo(formData.tipo).icon} size={16} color={getTipoInfo(formData.tipo).color} />
              </View>
              <Text style={[styles.selectorValue, { color: getTipoInfo(formData.tipo).color }]}>
                {getTipoInfo(formData.tipo).label}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#71717A" />
          </TouchableOpacity>
        </View>

        {/* Nivel */}
        <View style={styles.section}>
          <Text style={styles.label}>Nivel *</Text>
          <TouchableOpacity style={styles.selectorRow} onPress={() => setShowNivelModal(true)}>
            <View style={styles.selectorLeft}>
              <View style={[styles.selectorIcon, { backgroundColor: getNivelInfo(formData.nivel).color + '22' }]}>
                <Ionicons name={getNivelInfo(formData.nivel).icon} size={16} color={getNivelInfo(formData.nivel).color} />
              </View>
              <Text style={[styles.selectorValue, { color: getNivelInfo(formData.nivel).color }]}>
                {getNivelInfo(formData.nivel).label}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#71717A" />
          </TouchableOpacity>
        </View>

        {/* Días */}
        <View style={styles.section}>
          <Text style={styles.label}>Días de entrenamiento *</Text>
          <TouchableOpacity style={styles.selectorRow} onPress={() => setShowDiasModal(true)}>
            <View style={styles.selectorLeft}>
              <View style={[styles.selectorIcon, { backgroundColor: '#F9731622' }]}>
                <Ionicons name="calendar-outline" size={16} color="#F97316" />
              </View>
              <Text style={[styles.selectorValue, { color: formData.diasSemana.length > 0 ? '#F5F5F5' : '#71717A' }]}>
                {formatDias(formData.diasSemana)}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#71717A" />
          </TouchableOpacity>
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
            <View style={styles.addButtonsContainer}>
              <TouchableOpacity
                style={styles.addFromLibraryButton}
                onPress={() => setShowSelectorModal(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="library-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.addFromLibraryButtonText}>Biblioteca</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addExerciseButton}
                onPress={() => setShowExerciseModal(true)}
              >
                <Text style={styles.addExerciseButtonText}>+ Manual</Text>
              </TouchableOpacity>
            </View>
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
                <TouchableOpacity onPress={() => removeExercise(index)} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
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
                <Ionicons name="close" size={22} color="#A1A1AA" />
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
              <View style={styles.grupoGrid}>
                {[
                  { key: 'pecho',      icon: 'body-outline',        label: 'Pecho' },
                  { key: 'espalda',    icon: 'fitness-outline',     label: 'Espalda' },
                  { key: 'piernas',    icon: 'walk-outline',        label: 'Piernas' },
                  { key: 'hombros',    icon: 'trending-up-outline', label: 'Hombros' },
                  { key: 'brazos',     icon: 'barbell-outline',     label: 'Brazos' },
                  { key: 'abdominales',icon: 'layers-outline',      label: 'Abdomen' },
                  { key: 'cardio',     icon: 'heart-outline',       label: 'Cardio' },
                  { key: 'fullbody',   icon: 'flash-outline',       label: 'Full Body' },
                ].map(({ key, icon, label }) => {
                  const active = newExercise.grupoMuscular === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.grupoChip, active && styles.grupoChipActive]}
                      onPress={() => setNewExercise({ ...newExercise, grupoMuscular: key })}
                    >
                      <Ionicons name={icon} size={16} color={active ? '#FFFFFF' : '#71717A'} />
                      <Text style={[styles.grupoChipText, active && styles.grupoChipTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>Agregar Ejercicio</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Selector de Biblioteca Modal */}
      <SelectorEjerciciosModal
        visible={showSelectorModal}
        onClose={() => setShowSelectorModal(false)}
        onSelectEjercicio={handleSelectFromBiblioteca}
      />

      {/* Tipo Picker */}
      <Modal visible={showTipoModal} animationType="slide" transparent={true} onRequestClose={() => setShowTipoModal(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Tipo de rutina</Text>
            {TIPOS.map(({ key, icon, color, label }) => {
              const active = formData.tipo === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.pickerOption, active && styles.pickerOptionActive]}
                  onPress={() => { setFormData({ ...formData, tipo: key }); setShowTipoModal(false); }}
                >
                  <View style={[styles.pickerOptionIcon, { backgroundColor: color + '22' }]}>
                    <Ionicons name={icon} size={18} color={color} />
                  </View>
                  <Text style={[styles.pickerOptionText, active && styles.pickerOptionTextActive]}>{label}</Text>
                  {active && <Ionicons name="checkmark-circle" size={20} color="#F97316" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Nivel Picker */}
      <Modal visible={showNivelModal} animationType="slide" transparent={true} onRequestClose={() => setShowNivelModal(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Nivel</Text>
            {NIVELES.map(({ key, icon, color, label }) => {
              const active = formData.nivel === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.pickerOption, active && styles.pickerOptionActive]}
                  onPress={() => { setFormData({ ...formData, nivel: key }); setShowNivelModal(false); }}
                >
                  <View style={[styles.pickerOptionIcon, { backgroundColor: color + '22' }]}>
                    <Ionicons name={icon} size={18} color={color} />
                  </View>
                  <Text style={[styles.pickerOptionText, active && styles.pickerOptionTextActive]}>{label}</Text>
                  {active && <Ionicons name="checkmark-circle" size={20} color="#F97316" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Días Picker */}
      <Modal visible={showDiasModal} animationType="slide" transparent={true} onRequestClose={() => setShowDiasModal(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>Días de entrenamiento</Text>
            {DIAS.map((dia) => {
              const active = formData.diasSemana.includes(dia);
              return (
                <TouchableOpacity
                  key={dia}
                  style={[styles.pickerOption, active && styles.pickerOptionActive]}
                  onPress={() => toggleDay(dia)}
                >
                  <View style={[styles.checkbox, active && styles.checkboxSelected]}>
                    {active && <Ionicons name="checkmark" size={14} color="#F97316" />}
                  </View>
                  <Text style={[styles.pickerOptionText, active && styles.pickerOptionTextActive]}>
                    {dia.charAt(0).toUpperCase() + dia.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowDiasModal(false)}>
              <Text style={styles.pickerDoneBtnText}>
                {formData.diasSemana.length > 0 ? `Listo · ${formData.diasSemana.length} día(s)` : 'Cerrar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
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
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    fontSize: 16,
    color: '#F97316',
    fontWeight: '600',
    marginLeft: 2,
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#FFFFFF', 
    marginBottom: 4 
  },
  headerSubtitle: { fontSize: 13, color: '#F97316' },  // Naranja claro
  form: { flex: 1, padding: 16 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#F5F5F5', marginBottom: 8 },
  input: { 
    backgroundColor: '#1C1C1E', 
    borderRadius: 12, 
    padding: 14, 
    fontSize: 16, 
    borderWidth: 2, 
    borderColor: '#2C2C2E',
    color: '#F5F5F5',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  selectorRow: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#2C2C2E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectorIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    borderTopWidth: 4,
    borderTopColor: '#F97316',
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3F3F46',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F5F5F5',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  pickerOptionActive: {
    backgroundColor: '#252525',
  },
  pickerOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#A1A1AA',
    fontWeight: '500',
    flex: 1,
  },
  pickerOptionTextActive: {
    color: '#F5F5F5',
    fontWeight: '700',
  },
  pickerDoneBtn: {
    backgroundColor: '#F97316',
    margin: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EA6C0A',
  },
  pickerDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  addButtonsContainer: {
    flexDirection: 'row',
    gap: 8
  },
  addFromLibraryButton: { 
    backgroundColor: '#8B5CF6',  // Violeta para biblioteca
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#6D28D9',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addFromLibraryButtonText: { 
    color: '#FFFFFF', 
    fontSize: 12, 
    fontWeight: 'bold' 
  },
  addExerciseButton: { 
    backgroundColor: '#F97316',  // Naranja O2
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#EA6C0A',
  },
  addExerciseButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#A1A1AA', fontSize: 14, paddingVertical: 20 },
  exerciseItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1C1C1E', 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F97316',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  exerciseNumber: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: '#F97316',  // Naranja O2
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#EA6C0A',
  },
  exerciseNumberText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  exerciseInfo: { flex: 1 },
  exerciseName: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#F5F5F5',  // Negro O2
    marginBottom: 2 
  },
  exerciseDetails: { fontSize: 12, color: '#A1A1AA' },
  submitButton: { 
    backgroundColor: '#F97316',  // Naranja O2
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginVertical: 24,
    borderWidth: 2,
    borderColor: '#EA6C0A',
    shadowColor: '#F97316',
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
    backgroundColor: '#1C1C1E', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    maxHeight: '80%',
    borderTopWidth: 4,
    borderTopColor: '#F97316',  // Naranja O2
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E'
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#F5F5F5'  // Negro O2
  },
  exerciseForm: { padding: 20 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  addButton: { 
    backgroundColor: '#F97316',  // Naranja O2
    padding: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#EA6C0A',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  grupoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  grupoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '47%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  grupoChipActive: {
    backgroundColor: '#F97316',
    borderColor: '#EA6C0A',
  },
  grupoChipText: { fontSize: 13, fontWeight: '600', color: '#71717A' },
  grupoChipTextActive: { color: '#FFFFFF' },
});