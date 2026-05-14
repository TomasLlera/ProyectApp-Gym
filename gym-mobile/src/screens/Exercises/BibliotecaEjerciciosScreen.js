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
import { Ionicons } from '@expo/vector-icons';
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
  const [seeding, setSeeding] = useState(false);

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

  const handleSeedCardio = async () => {
    setSeeding(true);
    try {
      const creados = await bibliotecaEjerciciosService.seedCardioEjercicios();
      Alert.alert('Cardio cargado', creados > 0 ? `${creados} ejercicios de cardio agregados a la biblioteca.` : 'Los ejercicios de cardio ya estaban cargados.');
      loadEjercicios();
      loadEstadisticas();
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los ejercicios de cardio');
    } finally {
      setSeeding(false);
    }
  };

  const handleSeedAll = async () => {
    setSeeding(true);
    try {
      const creados = await bibliotecaEjerciciosService.crearEjerciciosPredeterminados();
      Alert.alert('Biblioteca cargada', creados > 0 ? `${creados} ejercicios predefinidos agregados.` : 'Los ejercicios ya estaban cargados.');
      loadEjercicios();
      loadEstadisticas();
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los ejercicios predefinidos');
    } finally {
      setSeeding(false);
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
            <View style={[styles.badge, { backgroundColor: getGrupoColor(item.grupoMuscular) + '22', borderColor: getGrupoColor(item.grupoMuscular) + '60' }]}>
              <Text style={[styles.badgeText, { color: getGrupoColor(item.grupoMuscular) }]}>{item.grupoMuscular?.toUpperCase()}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: getDificultadColor(item.dificultad) + '22', borderColor: getDificultadColor(item.dificultad) + '60' }]}>
              <Text style={[styles.badgeText, { color: getDificultadColor(item.dificultad) }]}>{item.dificultad?.toUpperCase()}</Text>
            </View>
          </View>
          {item.equipamiento && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
              <Ionicons name="barbell-outline" size={12} color="#71717A" />
              <Text style={styles.equipamiento}>{item.equipamiento}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => deleteEjercicio(item)}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.favoritoBtn}
            onPress={() => toggleFavorito(item.id)}
          >
            <Ionicons
              name={item.favorito ? 'star' : 'star-outline'}
              size={18}
              color={item.favorito ? '#F59E0B' : '#3F3F46'}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.statItem}>
          <Ionicons name="repeat-outline" size={12} color="#71717A" />
          <Text style={styles.detailText}>{item.seriesSugeridas}x{item.repeticionesSugeridas}</Text>
        </View>
        <View style={styles.statDot} />
        <View style={styles.statItem}>
          <Ionicons name="timer-outline" size={12} color="#71717A" />
          <Text style={styles.detailText}>{item.descansoSugerido}</Text>
        </View>
        {item.usosCount > 0 && (
          <>
            <View style={styles.statDot} />
            <View style={styles.statItem}>
              <Ionicons name="bar-chart-outline" size={12} color="#F97316" />
              <Text style={styles.usosText}>{item.usosCount} usos</Text>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonRow} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#F97316" />
          <Text style={styles.backButton}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Biblioteca de Ejercicios</Text>
        {estadisticas && (
          <Text style={styles.headerSubtitle}>
            {estadisticas.total} ejercicios · {estadisticas.favoritos} favoritos
          </Text>
        )}
      </View>


      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#71717A" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar ejercicio..."
          placeholderTextColor="#71717A"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <TouchableOpacity
          style={[styles.favFilterBtn, soloFavoritos && styles.favFilterBtnActive]}
          onPress={() => setSoloFavoritos(!soloFavoritos)}
        >
          <Ionicons name="star" size={18} color={soloFavoritos ? '#F59E0B' : '#71717A'} />
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
            <Ionicons
              name={grupoFilter === 'cardio' ? 'heart-outline' : 'barbell-outline'}
              size={64} color="#3F3F46" style={{ marginBottom: 16 }}
            />
            <Text style={styles.emptyText}>
              {grupoFilter === 'cardio' ? 'Sin ejercicios de cardio' : 'No hay ejercicios'}
            </Text>
            {grupoFilter === 'cardio' ? (
              <>
                <Text style={styles.emptySubtext}>
                  Cargá 15 ejercicios de cardio predefinidos (LISS, HIIT, funcional)
                </Text>
                <TouchableOpacity
                  style={[styles.seedBtn, seeding && { opacity: 0.6 }]}
                  onPress={handleSeedCardio}
                  disabled={seeding}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="flash-outline" size={16} color="#fff" />
                    <Text style={styles.seedBtnText}>
                      {seeding ? 'Cargando...' : 'Cargar ejercicios de cardio'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.emptySubtext}>
                  Cargá todos los ejercicios predefinidos o presioná + para crear uno
                </Text>
                <TouchableOpacity
                  style={[styles.seedBtn, seeding && { opacity: 0.6 }]}
                  onPress={handleSeedAll}
                  disabled={seeding}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="library-outline" size={16} color="#fff" />
                    <Text style={styles.seedBtnText}>
                      {seeding ? 'Cargando...' : 'Cargar todos los predefinidos'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
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
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color="#A1A1AA" />
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
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color="#A1A1AA" />
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
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: {
    backgroundColor: '#1A1A1A',
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 3,
    borderBottomColor: '#F97316',
  },
  backButtonRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backButton: { fontSize: 16, color: '#F97316', fontWeight: '600', marginLeft: 2 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#F97316' },
  emptySubtext: { fontSize: 14, color: '#A1A1AA', marginTop: 8, textAlign: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', margin: 16, marginBottom: 8, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: '#2C2C2E' },
  searchIcon: { fontSize: 20, marginRight: 8 },
  searchInput: { flex: 1, padding: 12, fontSize: 16, color: '#F5F5F5' },
  favFilterBtn: { padding: 8, borderRadius: 8, backgroundColor: '#2C2C2E' },
  favFilterBtnActive: { backgroundColor: '#431407' },
  favFilterText: { fontSize: 20 },
  filtersScroll: { backgroundColor: '#1C1C1E', paddingVertical: 12 },
  filters: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#2C2C2E', borderWidth: 2, borderColor: '#2C2C2E' },
  filterChipActive: { backgroundColor: '#F97316', borderColor: '#EA6C0A' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#A1A1AA' },
  filterTextActive: { color: '#FFFFFF' },
  list: { padding: 16 },
  ejercicioCard: { backgroundColor: '#1C1C1E', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardInfo: { flex: 1 },
  ejercicioName: { fontSize: 17, fontWeight: 'bold', color: '#F5F5F5', marginBottom: 8 },
  badges: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  equipamiento: { fontSize: 12, color: '#71717A' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#DC262618', justifyContent: 'center', alignItems: 'center',
  },
  favoritoBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#2C2C2E', justifyContent: 'center', alignItems: 'center',
  },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#3F3F46' },
  detailText: { fontSize: 12, color: '#71717A', fontWeight: '500' },
  usosText: { fontSize: 12, color: '#F97316', fontWeight: '600' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, color: '#F5F5F5', fontWeight: '600', marginBottom: 24 },
  seedBtn: {
    marginTop: 16, backgroundColor: '#F97316',
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, borderWidth: 2, borderColor: '#EA6C0A',
    shadowColor: '#F97316', shadowOpacity: 0.4, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  seedBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: '#F97316', justifyContent: 'center', alignItems: 'center', shadowColor: '#F97316', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 12, borderWidth: 3, borderColor: '#FFFFFF' },
  fabText: { fontSize: 28, color: '#FFFFFF', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26, 26, 26, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', borderTopWidth: 4, borderTopColor: '#F97316' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#F5F5F5' },
  formContainer: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#F5F5F5', marginBottom: 8 },
  input: { backgroundColor: '#2C2C2E', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2C2C2E', color: '#F5F5F5' },
  textArea: { height: 80, textAlignVertical: 'top' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#2C2C2E', borderWidth: 2, borderColor: '#2C2C2E' },
  chipActive: { backgroundColor: '#F97316', borderColor: '#EA6C0A' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#A1A1AA' },
  chipTextActive: { color: '#FFFFFF' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  submitButton: { backgroundColor: '#F97316', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8, borderWidth: 2, borderColor: '#EA6C0A', shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

