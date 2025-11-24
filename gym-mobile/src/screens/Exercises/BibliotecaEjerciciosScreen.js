// src/screens/Exercises/BibliotecaEjerciciosScreen.js

import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { bibliotecaEjerciciosService } from '../../database/bibliotecaEjerciciosService';

export default function BibliotecaEjerciciosScreen({ navigation }) {
  const [ejercicios, setEjercicios] = useState([]);
  const [filteredEjercicios, setFilteredEjercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [grupoFilter, setGrupoFilter] = useState('');
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEjercicio, setSelectedEjercicio] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      loadEjercicios();
      loadEstadisticas();
    }, [grupoFilter, soloFavoritos, searchTerm])
  );

  const loadEjercicios = async () => {
    try {
      const filtros = {
        grupoMuscular: grupoFilter || undefined,
        soloFavoritos,
        busqueda: searchTerm || undefined,
        ordenarPorFavoritos: true
      };
      
      const data = await bibliotecaEjerciciosService.getAll(filtros);
      setEjercicios(data);
      setFilteredEjercicios(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los ejercicios');
    } finally {
      setLoading(false);
    }
  };

  const loadEstadisticas = async () => {
    try {
      const stats = await bibliotecaEjerciciosService.getEstadisticas();
      setEstadisticas(stats);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const toggleFavorito = async (id) => {
    try {
      await bibliotecaEjerciciosService.toggleFavorito(id);
      loadEjercicios();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el favorito');
    }
  };

  const deleteEjercicio = (ejercicio) => {
    Alert.alert(
      'Eliminar Ejercicio',
      `¿Estás seguro de eliminar "${ejercicio.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await bibliotecaEjerciciosService.delete(ejercicio.id);
              Alert.alert('Éxito', 'Ejercicio eliminado');
              loadEjercicios();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar');
            }
          }
        }
      ]
    );
  };


  const renderEjercicio = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.ejercicioCard,
        { borderLeftColor: getGrupoColor(item.grupoMuscular) }
      ]}
      onPress={() => {
        setSelectedEjercicio(item);
        setShowEditModal(true);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.ejercicioName}>{item.nombre}</Text>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: getGrupoColor(item.grupoMuscular) }]}>
              <Text style={styles.badgeText}>{item.grupoMuscular}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getDificultadColor(item.dificultad) }]}>
              <Text style={styles.badgeText}>{item.dificultad}</Text>
            </View>
          </View>
          {item.equipamiento && (
            <Text style={styles.equipamiento}>🏋️ {item.equipamiento}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.favoritoBtn}
          onPress={() => toggleFavorito(item.id)}
        >
          <Text style={styles.favoritoIcon}>{item.favorito ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.detailText}>
          {item.seriesSugeridas}x{item.repeticionesSugeridas}
        </Text>
        <Text style={styles.detailText}>•</Text>
        <Text style={styles.detailText}>{item.descansoSugerido}</Text>
        {item.usosCount > 0 && (
          <>
            <Text style={styles.detailText}>•</Text>
            <Text style={styles.usosText}>📊 {item.usosCount} usos</Text>
          </>
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => deleteEjercicio(item)}
        >
          <Text style={styles.deleteBtnText}>🗑️ Eliminar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📚 Biblioteca de Ejercicios</Text>
        {estadisticas && (
          <Text style={styles.headerSubtitle}>
            {estadisticas.total} ejercicio(s) • {estadisticas.favoritos} favorito(s)
          </Text>
        )}
      </View>


      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar ejercicio..."
          placeholderTextColor="#9CA3AF"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <TouchableOpacity
          style={[styles.favFilterBtn, soloFavoritos && styles.favFilterBtnActive]}
          onPress={() => setSoloFavoritos(!soloFavoritos)}
        >
          <Text style={styles.favFilterText}>⭐</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filters}
      >
        <TouchableOpacity
          style={[styles.filterChip, grupoFilter === '' && styles.filterChipActive]}
          onPress={() => setGrupoFilter('')}
        >
          <Text style={[styles.filterText, grupoFilter === '' && styles.filterTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
        {['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'abdominales', 'cardio'].map((grupo) => (
          <TouchableOpacity
            key={grupo}
            style={[styles.filterChip, grupoFilter === grupo && styles.filterChipActive]}
            onPress={() => setGrupoFilter(grupo)}
          >
            <Text style={[styles.filterText, grupoFilter === grupo && styles.filterTextActive]}>
              {grupo.charAt(0).toUpperCase() + grupo.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista */}
      <FlatList
        data={filteredEjercicios}
        renderItem={renderEjercicio}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏋️</Text>
            <Text style={styles.emptyText}>No hay ejercicios</Text>
            <Text style={styles.emptySubtext}>Presiona el botón + para crear tu primer ejercicio</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
      >
        <Text style={styles.fabText}>➕</Text>
      </TouchableOpacity>

      {/* Create Modal */}
      <CreateEjercicioModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadEjercicios();
        }}
      />

      {/* Edit Modal */}
      {selectedEjercicio && (
        <EditEjercicioModal
          visible={showEditModal}
          ejercicio={selectedEjercicio}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEjercicio(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedEjercicio(null);
            loadEjercicios();
          }}
        />
      )}
    </View>
  );
}

// ============================================
// 🆕 MODAL CREAR EJERCICIO
// ============================================
function CreateEjercicioModal({ visible, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    grupoMuscular: 'pecho',
    equipamiento: '',
    dificultad: 'intermedio',
    seriesSugeridas: '3',
    repeticionesSugeridas: '10-12',
    descansoSugerido: '60 seg',
    instrucciones: '',
    notas: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }
    setLoading(true);
    try {
      await bibliotecaEjerciciosService.create({
        ...formData,
        seriesSugeridas: parseInt(formData.seriesSugeridas) || 3
      });
      Alert.alert('Éxito', 'Ejercicio creado');
      onSuccess();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nuevo Ejercicio</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.formContainer}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              placeholder="Press de banca"
              value={formData.nombre}
              onChangeText={(text) => setFormData({ ...formData, nombre: text })}
            />

            <Text style={styles.label}>Grupo Muscular *</Text>
            <View style={styles.chipContainer}>
              {['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'abdominales', 'cardio', 'fullbody'].map((grupo) => (
                <TouchableOpacity
                  key={grupo}
                  style={[styles.chip, formData.grupoMuscular === grupo && styles.chipActive]}
                  onPress={() => setFormData({ ...formData, grupoMuscular: grupo })}
                >
                  <Text style={[styles.chipText, formData.grupoMuscular === grupo && styles.chipTextActive]}>
                    {grupo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Dificultad</Text>
            <View style={styles.chipContainer}>
              {['principiante', 'intermedio', 'avanzado'].map((dif) => (
                <TouchableOpacity
                  key={dif}
                  style={[styles.chip, formData.dificultad === dif && styles.chipActive]}
                  onPress={() => setFormData({ ...formData, dificultad: dif })}
                >
                  <Text style={[styles.chipText, formData.dificultad === dif && styles.chipTextActive]}>
                    {dif}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Equipamiento</Text>
            <TextInput
              style={styles.input}
              placeholder="Barra, Mancuernas, Máquina..."
              value={formData.equipamiento}
              onChangeText={(text) => setFormData({ ...formData, equipamiento: text })}
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Series</Text>
                <TextInput
                  style={styles.input}
                  placeholder="3"
                  value={formData.seriesSugeridas}
                  onChangeText={(text) => setFormData({ ...formData, seriesSugeridas: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Repeticiones</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-12"
                  value={formData.repeticionesSugeridas}
                  onChangeText={(text) => setFormData({ ...formData, repeticionesSugeridas: text })}
                />
              </View>
            </View>

            <Text style={styles.label}>Descanso</Text>
            <TextInput
              style={styles.input}
              placeholder="60 seg"
              value={formData.descansoSugerido}
              onChangeText={(text) => setFormData({ ...formData, descansoSugerido: text })}
            />

            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descripción breve del ejercicio..."
              value={formData.descripcion}
              onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Creando...' : 'Crear Ejercicio'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================
// ✏️ MODAL EDITAR EJERCICIO
// ============================================
function EditEjercicioModal({ visible, ejercicio, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ ...ejercicio });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ejercicio) {
      setFormData({
        ...ejercicio,
        seriesSugeridas: ejercicio.seriesSugeridas?.toString() || '3'
      });
    }
  }, [ejercicio]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await bibliotecaEjerciciosService.update(ejercicio.id, {
        ...formData,
        seriesSugeridas: parseInt(formData.seriesSugeridas) || 3
      });
      Alert.alert('Éxito', 'Ejercicio actualizado');
      onSuccess();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Ejercicio</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.formContainer}>
            <Text style={styles.label}>Nombre *</Text>
            <TextInput
              style={styles.input}
              value={formData.nombre}
              onChangeText={(text) => setFormData({ ...formData, nombre: text })}
            />

            <Text style={styles.label}>Grupo Muscular *</Text>
            <View style={styles.chipContainer}>
              {['pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'abdominales', 'cardio', 'fullbody'].map((grupo) => (
                <TouchableOpacity
                  key={grupo}
                  style={[styles.chip, formData.grupoMuscular === grupo && styles.chipActive]}
                  onPress={() => setFormData({ ...formData, grupoMuscular: grupo })}
                >
                  <Text style={[styles.chipText, formData.grupoMuscular === grupo && styles.chipTextActive]}>
                    {grupo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Dificultad</Text>
            <View style={styles.chipContainer}>
              {['principiante', 'intermedio', 'avanzado'].map((dif) => (
                <TouchableOpacity
                  key={dif}
                  style={[styles.chip, formData.dificultad === dif && styles.chipActive]}
                  onPress={() => setFormData({ ...formData, dificultad: dif })}
                >
                  <Text style={[styles.chipText, formData.dificultad === dif && styles.chipTextActive]}>
                    {dif}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Equipamiento</Text>
            <TextInput
              style={styles.input}
              value={formData.equipamiento || ''}
              onChangeText={(text) => setFormData({ ...formData, equipamiento: text })}
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Series</Text>
                <TextInput
                  style={styles.input}
                  value={formData.seriesSugeridas?.toString()}
                  onChangeText={(text) => setFormData({ ...formData, seriesSugeridas: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Repeticiones</Text>
                <TextInput
                  style={styles.input}
                  value={formData.repeticionesSugeridas}
                  onChangeText={(text) => setFormData({ ...formData, repeticionesSugeridas: text })}
                />
              </View>
            </View>

            <Text style={styles.label}>Descanso</Text>
            <TextInput
              style={styles.input}
              value={formData.descansoSugerido}
              onChangeText={(text) => setFormData({ ...formData, descansoSugerido: text })}
            />

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Helper functions
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
  return colors[grupo] || '#6B7280';
}

function getDificultadColor(dificultad) {
  const colors = {
    principiante: '#10B981',
    intermedio: '#F59E0B',
    avanzado: '#EF4444'
  };
  return colors[dificultad] || '#6B7280';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#1A1A1A',
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 3,
    borderBottomColor: '#FF6B35',
  },
  backButton: { fontSize: 16, color: '#FF6B35', marginBottom: 12, fontWeight: '600' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#FF8456' },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', margin: 16, marginBottom: 8, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: '#E5E7EB' },
  searchIcon: { fontSize: 20, marginRight: 8 },
  searchInput: { flex: 1, padding: 12, fontSize: 16, color: '#1A1A1A' },
  favFilterBtn: { padding: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  favFilterBtnActive: { backgroundColor: '#FFE5DC' },
  favFilterText: { fontSize: 20 },
  filtersScroll: { backgroundColor: '#FFFFFF', paddingVertical: 12 },
  filters: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: '#E5E7EB' },
  filterChipActive: { backgroundColor: '#FF6B35', borderColor: '#E55A2B' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF' },
  list: { padding: 16 },
  ejercicioCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardInfo: { flex: 1 },
  ejercicioName: { fontSize: 17, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8 },
  badges: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  equipamiento: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  favoritoBtn: { padding: 4 },
  favoritoIcon: { fontSize: 28 },
  cardFooter: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  detailText: { fontSize: 13, color: '#6B7280' },
  usosText: { fontSize: 13, color: '#FF6B35', fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  deleteBtn: { flex: 1, backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' },
  deleteBtnText: { color: '#DC2626', fontSize: 13, fontWeight: 'bold' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, color: '#1A1A1A', fontWeight: '600', marginBottom: 24 },
  emptyButton: { backgroundColor: '#FF6B35', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, borderWidth: 2, borderColor: '#E55A2B' },
  emptyButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center', shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 12, borderWidth: 3, borderColor: '#FFFFFF' },
  fabText: { fontSize: 28, color: '#FFFFFF', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26, 26, 26, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', borderTopWidth: 4, borderTopColor: '#FF6B35' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 2, borderBottomColor: '#FFE5DC' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  modalClose: { fontSize: 28, color: '#6B7280' },
  formContainer: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', color: '#1A1A1A' },
  textArea: { height: 80, textAlignVertical: 'top' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#FF6B35', borderColor: '#E55A2B' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#FFFFFF' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  submitButton: { backgroundColor: '#FF6B35', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8, borderWidth: 2, borderColor: '#E55A2B', shadowColor: '#FF6B35', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

