// src/components/SelectorEjerciciosModal.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { bibliotecaEjerciciosService } from '../database/bibliotecaEjerciciosService';

export default function SelectorEjerciciosModal({ visible, onClose, onSelectEjercicio }) {
  const [ejercicios, setEjercicios] = useState([]);
  const [filteredEjercicios, setFilteredEjercicios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [grupoFilter, setGrupoFilter] = useState('');
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadEjercicios();
    }
  }, [visible, grupoFilter, soloFavoritos, searchTerm]);

  const loadEjercicios = async () => {
    setLoading(true);
    try {
      const filtros = {
        grupoMuscular: grupoFilter || undefined,
        soloFavoritos,
        busqueda: searchTerm || undefined,
        ordenarPorUsos: true
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

  const handleSelect = async (ejercicio) => {
    try {
      // Incrementar contador de usos
      await bibliotecaEjerciciosService.incrementarUsos(ejercicio.id);
      
      // Crear objeto de ejercicio para la rutina
      const ejercicioParaRutina = {
        nombre: ejercicio.nombre,
        descripcion: ejercicio.descripcion || '',
        series: ejercicio.seriesSugeridas,
        repeticiones: ejercicio.repeticionesSugeridas,
        peso: 'A definir',
        descanso: ejercicio.descansoSugerido,
        grupoMuscular: ejercicio.grupoMuscular,
        notas: ejercicio.notas || '',
        // Mantener referencia al ejercicio de biblioteca
        bibliotecaId: ejercicio.id
      };
      
      onSelectEjercicio(ejercicioParaRutina);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar el ejercicio');
    }
  };

  const renderEjercicio = ({ item }) => (
    <TouchableOpacity
      style={[styles.ejercicioItem, { borderLeftColor: getGrupoColor(item.grupoMuscular) }]}
      onPress={() => handleSelect(item)}
    >
      <View style={styles.ejercicioInfo}>
        <View style={styles.ejercicioHeader}>
          <Text style={styles.ejercicioName}>{item.nombre}</Text>
          {item.favorito === 1 && <Text style={styles.favIcon}>⭐</Text>}
        </View>
        
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: getGrupoColor(item.grupoMuscular) }]}>
            <Text style={styles.badgeText}>{item.grupoMuscular}</Text>
          </View>
          {item.equipamiento && (
            <View style={[styles.badge, { backgroundColor: '#6B7280' }]}>
              <Text style={styles.badgeText}>{item.equipamiento}</Text>
            </View>
          )}
        </View>

        <Text style={styles.ejercicioDetails}>
          {item.seriesSugeridas}x{item.repeticionesSugeridas} • {item.descansoSugerido}
        </Text>

        {item.usosCount > 0 && (
          <Text style={styles.usosText}>📊 Usado {item.usosCount} veces</Text>
        )}
      </View>

      <View style={styles.selectButton}>
        <Text style={styles.selectButtonText}>➕</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📚 Seleccionar Ejercicio</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
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

          {/* Lista de ejercicios */}
          <FlatList
            data={filteredEjercicios}
            renderItem={renderEjercicio}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🏋️</Text>
                <Text style={styles.emptyText}>
                  {loading ? 'Cargando...' : 'No hay ejercicios'}
                </Text>
                {!loading && ejercicios.length === 0 && (
                  <Text style={styles.emptySubtext}>
                    Ve a la Biblioteca de Ejercicios para crear algunos
                  </Text>
                )}
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
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
  return colors[grupo] || '#6B7280';
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.7)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    borderTopWidth: 4,
    borderTopColor: '#FF6B35'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#FFE5DC'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A'
  },
  modalClose: {
    fontSize: 28,
    color: '#6B7280'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB'
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1A1A1A'
  },
  favFilterBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6'
  },
  favFilterBtnActive: {
    backgroundColor: '#FFE5DC'
  },
  favFilterText: {
    fontSize: 20
  },
  filtersScroll: {
    paddingVertical: 8
  },
  filters: {
    paddingHorizontal: 16,
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB'
  },
  filterChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#E55A2B'
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280'
  },
  filterTextActive: {
    color: '#FFFFFF'
  },
  list: {
    padding: 16
  },
  ejercicioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  ejercicioInfo: {
    flex: 1
  },
  ejercicioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  ejercicioName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1
  },
  favIcon: {
    fontSize: 16,
    marginLeft: 8
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  ejercicioDetails: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4
  },
  usosText: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '600'
  },
  selectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    borderWidth: 2,
    borderColor: '#E55A2B'
  },
  selectButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyText: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20
  }
});