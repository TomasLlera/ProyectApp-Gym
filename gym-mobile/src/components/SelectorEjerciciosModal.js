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
import { Ionicons } from '@expo/vector-icons';
import { bibliotecaEjerciciosService } from '../database/bibliotecaEjerciciosService';

const GRUPOS = [
  { key: '',            icon: 'apps-outline',         label: 'Todos',    color: '#F97316' },
  { key: 'pecho',       icon: 'body-outline',          label: 'Pecho',    color: '#EF4444' },
  { key: 'espalda',     icon: 'fitness-outline',       label: 'Espalda',  color: '#3B82F6' },
  { key: 'piernas',     icon: 'walk-outline',          label: 'Piernas',  color: '#10B981' },
  { key: 'hombros',     icon: 'trending-up-outline',   label: 'Hombros',  color: '#F59E0B' },
  { key: 'brazos',      icon: 'barbell-outline',       label: 'Brazos',   color: '#8B5CF6' },
  { key: 'abdominales', icon: 'layers-outline',        label: 'Abdomen',  color: '#EC4899' },
  { key: 'cardio',      icon: 'heart-outline',         label: 'Cardio',   color: '#F97316' },
];

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
      await bibliotecaEjerciciosService.incrementarUsos(ejercicio.id);
      const ejercicioParaRutina = {
        nombre: ejercicio.nombre,
        descripcion: ejercicio.descripcion || '',
        series: ejercicio.seriesSugeridas,
        repeticiones: ejercicio.repeticionesSugeridas,
        peso: 'A definir',
        descanso: ejercicio.descansoSugerido,
        grupoMuscular: ejercicio.grupoMuscular,
        notas: ejercicio.notas || '',
        bibliotecaId: ejercicio.id
      };
      onSelectEjercicio(ejercicioParaRutina);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar el ejercicio');
    }
  };

  const getGrupoInfo = (key) => GRUPOS.find(g => g.key === key) || GRUPOS[0];

  const renderEjercicio = ({ item }) => {
    const grupoInfo = getGrupoInfo(item.grupoMuscular);
    return (
      <TouchableOpacity
        style={[styles.ejercicioItem, { borderLeftColor: grupoInfo.color }]}
        onPress={() => handleSelect(item)}
      >
        {/* Grupo icon */}
        <View style={[styles.grupoIcon, { backgroundColor: grupoInfo.color + '22' }]}>
          <Ionicons name={grupoInfo.icon} size={18} color={grupoInfo.color} />
        </View>

        <View style={styles.ejercicioInfo}>
          <View style={styles.ejercicioHeader}>
            <Text style={styles.ejercicioName} numberOfLines={1}>{item.nombre}</Text>
            {item.favorito === 1 && (
              <Ionicons name="star" size={14} color="#F59E0B" style={{ marginLeft: 6 }} />
            )}
          </View>

          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: grupoInfo.color + '22', borderColor: grupoInfo.color + '60' }]}>
              <Text style={[styles.badgeText, { color: grupoInfo.color }]}>{grupoInfo.label.toUpperCase()}</Text>
            </View>
            {item.equipamiento && (
              <View style={styles.badgeGray}>
                <Text style={styles.badgeGrayText}>{item.equipamiento}</Text>
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="repeat-outline" size={12} color="#71717A" />
              <Text style={styles.statText}>{item.seriesSugeridas}x{item.repeticionesSugeridas}</Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.statItem}>
              <Ionicons name="timer-outline" size={12} color="#71717A" />
              <Text style={styles.statText}>{item.descansoSugerido}</Text>
            </View>
            {item.usosCount > 0 && (
              <>
                <View style={styles.statDot} />
                <View style={styles.statItem}>
                  <Ionicons name="bar-chart-outline" size={12} color="#F97316" />
                  <Text style={[styles.statText, { color: '#F97316' }]}>{item.usosCount} usos</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.addButton}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBox}>
                <Ionicons name="library-outline" size={18} color="#8B5CF6" />
              </View>
              <Text style={styles.modalTitle}>Biblioteca</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {/* Búsqueda + favoritos */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={16} color="#71717A" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar ejercicio..."
              placeholderTextColor="#52525B"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            <TouchableOpacity
              style={[styles.favBtn, soloFavoritos && styles.favBtnActive]}
              onPress={() => setSoloFavoritos(!soloFavoritos)}
            >
              <Ionicons
                name={soloFavoritos ? 'star' : 'star-outline'}
                size={16}
                color={soloFavoritos ? '#F59E0B' : '#71717A'}
              />
            </TouchableOpacity>
          </View>

          {/* Filtros de grupo muscular */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filtersContent}
          >
            {GRUPOS.map(({ key, icon, label, color }) => {
              const active = grupoFilter === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.filterChip,
                    active && { backgroundColor: color + '22', borderColor: color + '60' }
                  ]}
                  onPress={() => setGrupoFilter(key)}
                >
                  <Ionicons name={icon} size={13} color={active ? color : '#71717A'} />
                  <Text style={[styles.filterText, active && { color }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Lista */}
          <FlatList
            data={filteredEjercicios}
            renderItem={renderEjercicio}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="barbell-outline" size={56} color="#3F3F46" style={{ marginBottom: 14 }} />
                <Text style={styles.emptyText}>
                  {loading ? 'Cargando...' : 'No hay ejercicios'}
                </Text>
                {!loading && ejercicios.length === 0 && (
                  <Text style={styles.emptySubtext}>
                    Ve a la Biblioteca de Ejercicios para agregar algunos
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

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    borderTopWidth: 4,
    borderTopColor: '#8B5CF6',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3F3F46',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#8B5CF622',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F5F5F5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2C2C2E',
    backgroundColor: '#141414',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F5F5F5',
  },
  favBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
  },
  favBtnActive: {
    backgroundColor: '#F59E0B22',
  },
  filtersScroll: {
    paddingBottom: 4,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717A',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  ejercicioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252525',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  grupoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ejercicioInfo: {
    flex: 1,
  },
  ejercicioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ejercicioName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F5F5F5',
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  badgeGray: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  badgeGrayText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#71717A',
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 12,
    color: '#71717A',
    fontWeight: '500',
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#3F3F46',
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#A1A1AA',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#52525B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
