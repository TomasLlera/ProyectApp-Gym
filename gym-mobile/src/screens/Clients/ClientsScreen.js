// src/screens/Clients/ClientsScreen.js
import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useDatabase } from '../../context/DatabaseContext';

export default function ClientsScreen({ navigation, route }) {
  const { clients } = useDatabase();
  const [clientsList, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(route.params?.status || '');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadClients();
  }, [statusFilter, searchTerm]);

  // Actualizar filtro cuando cambien los parámetros de navegación
  useEffect(() => {
    if (route.params?.status !== undefined) {
      setStatusFilter(route.params.status);
    }
  }, [route.params?.status]);

  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.refresh || route.params?.updated) {
        loadClients();
      }
      // También actualizar filtro al enfocar la pantalla
      if (route.params?.status !== undefined) {
        setStatusFilter(route.params.status);
      }
    }, [route.params?.refresh, route.params?.updated, route.params?.status])
  );

  const loadClients = async () => {
    try {
      const clientesList = await clients.getAll();
      
      // Aplicar filtros
      let filteredClients = clientesList;
      
      // Filtro por estado de pago
      if (statusFilter) {
        filteredClients = filteredClients.filter(client => client.estadoPago === statusFilter);
      }
      
      // Filtro por búsqueda
      if (searchTerm) {
        filteredClients = filteredClients.filter(client => 
          client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.documento.includes(searchTerm)
        );
      }
      
      setClients(filteredClients);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los clientes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadClients();
  };

  const handleSearch = () => {
    setLoading(true);
    loadClients();
  };

  const markAsPaid = async (clientId) => {
    Alert.alert(
      'Confirmar Pago',
      '¿Marcar como pagado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await clients.updatePaymentStatus(clientId, 'pagado');
              Alert.alert('Éxito', 'Cliente marcado como pagado');
              loadClients();
            } catch (error) {
              Alert.alert('Error', 'No se pudo actualizar el estado');
            }
          }
        }
      ]
    );
  };

  const getStatusBadge = (status) => {
    const config = {
      pagado: { label: '✅ Al día', color: '#10B981', bgColor: '#D1FAE5' },
      vencido: { label: '⚠️ Vencido', color: '#EF4444', bgColor: '#FEE2E2' },
      pendiente: { label: '⏳ Pendiente', color: '#F59E0B', bgColor: '#FEF3C7' },
    };
    return config[status] || config.pendiente;
  };

  const renderClient = ({ item }) => {
    const badge = getStatusBadge(item.estadoPago);

    return (
      <TouchableOpacity
        key={item._id || item.id}
        style={[styles.clientCard, { borderLeftColor: badge.color }]}
        onPress={() => {
          const idToUse = item._id || item.id;
          console.log('Cliente seleccionado:', idToUse);
          if (!idToUse) {
            Alert.alert('Error', 'ID de cliente no válido');
            return;
          }
          navigation.navigate('ClientDetail', { clientId: idToUse });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatarCircle, { 
            borderColor: badge.color,
            borderWidth: 2
          }]}>
            <Text style={styles.avatarInitial}>
              {item.nombre.charAt(0)}{item.apellido.charAt(0)}
            </Text>
          </View>

          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>
              {item.nombre} {item.apellido}
            </Text>
            <Text style={styles.clientEmail}>{item.email}</Text>
            <Text style={styles.clientDoc}>DNI: {item.documento}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: badge.bgColor }]}>
            <Text style={[styles.statusText, { color: badge.color }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Cuota mensual</Text>
            <Text style={styles.amountValue}>${item.montoMensual}</Text>
          </View>

          {item.estadoPago !== 'pagado' && (
            <TouchableOpacity
              style={[styles.payButton, { 
                borderColor: badge.color,
                borderWidth: 2
              }]}
              onPress={(e) => {
                e.stopPropagation();
                markAsPaid(item.id || item._id);
              }}
            >
              <Text style={styles.payButtonText}>💰 Pagar</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cliente..."
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
          />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
          style={styles.filterScroll}
        >
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === '' && styles.filterChipActive]}
            onPress={() => setStatusFilter('')}
          >
            <Text style={[styles.filterText, statusFilter === '' && styles.filterTextActive]}>
              📊 Todos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'pagado' && styles.filterChipActive]}
            onPress={() => setStatusFilter('pagado')}
          >
            <Text style={[styles.filterText, statusFilter === 'pagado' && styles.filterTextActive]}>
              ✅ Al día
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'vencido' && styles.filterChipActive]}
            onPress={() => setStatusFilter('vencido')}
          >
            <Text style={[styles.filterText, statusFilter === 'vencido' && styles.filterTextActive]}>
              ⚠️ Vencidos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'pendiente' && styles.filterChipActive]}
            onPress={() => setStatusFilter('pendiente')}
          >
            <Text style={[styles.filterText, statusFilter === 'pendiente' && styles.filterTextActive]}>
              🕒 Pendientes
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Client List */}
      <FlatList
        data={clientsList}
        renderItem={renderClient}
        keyExtractor={(item) => item._id || item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏋️</Text>
            <Text style={styles.emptyText}>No hay clientes</Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.fabIcon}>➕</Text>
      </TouchableOpacity>

      {/* Create Client Modal */}
      <CreateClientModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false);
          loadClients();
        }}
      />
    </View>
  );
}

// Modal para crear cliente
function CreateClientModal({ visible, onClose, onSuccess }) {
  const { clients } = useDatabase();
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    documento: '',
    telefono: '',
    tipoPlan: 'mensual',  // ← NUEVO
    montoMensual: '3500',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.nombre || !formData.apellido || !formData.email || !formData.documento) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    // Validar DNI - exactamente 8 dígitos
    const dniRegex = /^\d{8}$/;
    if (!dniRegex.test(formData.documento)) {
      Alert.alert('Error', 'El DNI debe tener exactamente 8 dígitos numéricos');
      return;
    }

    // Validar teléfono si se ingresó
    if (formData.telefono.trim()) {
      let telefono = formData.telefono.trim();
      
      // Si no empieza con +54, agregarlo automáticamente
      if (!telefono.startsWith('+54')) {
        // Limpiar el número de caracteres no numéricos
        telefono = telefono.replace(/[^0-9]/g, '');
        // Agregar +54 automáticamente
        telefono = '+54' + telefono;
      }
      
      // Validar formato final: +54 seguido de al menos 9 dígitos
      const telefonoRegex = /^\+54\d{9,}$/;
      if (!telefonoRegex.test(telefono)) {
        Alert.alert('Error', 'El teléfono debe tener formato +54 seguido de al menos 9 dígitos');
        return;
      }
      
      // Actualizar el teléfono formateado
      formData.telefono = telefono;
    }

    // Verificar si ya existe un cliente con el mismo DNI
    setLoading(true);
    try {
      const existingClients = await clients.getAll();
      const duplicateDNI = existingClients.find(client => client.documento === formData.documento);
      
      if (duplicateDNI) {
        Alert.alert('Error', 'Ya existe un cliente con ese DNI');
        setLoading(false);
        return;
      }

      await clients.create({
        ...formData,
        montoMensual: parseFloat(formData.montoMensual),
      });
      Alert.alert('Éxito', '✅ Cliente creado exitosamente');
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        documento: '',
        telefono: '',
        tipoPlan: 'mensual',
        montoMensual: '3500',
      });
      onSuccess();
    } catch (error) {
      console.error('Error creando cliente:', error);
      
      // Manejar errores específicos de SQLite
      let errorMessage = 'Error al crear cliente';
      if (error.message.includes('UNIQUE constraint failed: clientes.email')) {
        errorMessage = 'Ya existe un cliente con ese email';
      } else if (error.message.includes('UNIQUE constraint failed: clientes.documento')) {
        errorMessage = 'Ya existe un cliente con ese DNI';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nuevo Cliente</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Nombre *"
              value={formData.nombre}
              onChangeText={(text) => setFormData({ ...formData, nombre: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Apellido *"
              value={formData.apellido}
              onChangeText={(text) => setFormData({ ...formData, apellido: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Email *"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="DNI *"
              value={formData.documento}
              onChangeText={(text) => setFormData({ ...formData, documento: text })}
              keyboardType="numeric"
            />

            {/* SELECTOR DE PLAN - NUEVO */}
            <View style={styles.planSelector}>
              <Text style={styles.planLabel}>Tipo de Plan *</Text>
              <View style={styles.planOptions}>
                <TouchableOpacity
                  style={[styles.planChip, formData.tipoPlan === 'diario' && styles.planChipActive]}
                  onPress={() => setFormData({ ...formData, tipoPlan: 'diario' })}
                >
                  <Text style={[styles.planChipText, formData.tipoPlan === 'diario' && styles.planChipTextActive]}>
                    📅 Diario
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.planChip, formData.tipoPlan === 'semanal' && styles.planChipActive]}
                  onPress={() => setFormData({ ...formData, tipoPlan: 'semanal' })}
                >
                  <Text style={[styles.planChipText, formData.tipoPlan === 'semanal' && styles.planChipTextActive]}>
                    🗓️ Semanal
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.planChip, formData.tipoPlan === 'quincenal' && styles.planChipActive]}
                  onPress={() => setFormData({ ...formData, tipoPlan: 'quincenal' })}
                >
                  <Text style={[styles.planChipText, formData.tipoPlan === 'quincenal' && styles.planChipTextActive]}>
                    📆 Quincenal
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.planChip, formData.tipoPlan === 'mensual' && styles.planChipActive]}
                  onPress={() => setFormData({ ...formData, tipoPlan: 'mensual' })}
                >
                  <Text style={[styles.planChipText, formData.tipoPlan === 'mensual' && styles.planChipTextActive]}>
                    📅 Mensual
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.planChip, formData.tipoPlan === 'anual' && styles.planChipActive]}
                  onPress={() => setFormData({ ...formData, tipoPlan: 'anual' })}
                >
                  <Text style={[styles.planChipText, formData.tipoPlan === 'anual' && styles.planChipTextActive]}>
                    🎯 Anual
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.phoneContainer}>
              <Text style={styles.phonePrefix}>+54</Text>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholder="Número de celular (ej: 1123456789)"
                value={formData.telefono.replace('+54', '')}
                onChangeText={(text) => {
                  // Solo permitir números
                  const numbersOnly = text.replace(/[^0-9]/g, '');
                  // Actualizar el estado con +54 incluido
                  setFormData({ ...formData, telefono: numbersOnly ? '+54' + numbersOnly : '' });
                }}
                keyboardType="phone-pad"
                maxLength={15} // Limitar la longitud
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Monto Mensual *"
              value={formData.montoMensual}
              onChangeText={(text) => setFormData({ ...formData, montoMensual: text })}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Creando...' : 'Crear Cliente'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 20, marginRight: 8 },
  searchInput: { flex: 1, padding: 12, fontSize: 16, color: '#1F2937' },
  filterContainer: { 
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    paddingVertical: 16,
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterScrollContent: {
    paddingHorizontal: 0,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 100,
  },
  filterChipActive: { 
    backgroundColor: '#4F46E5',
    borderColor: '#3730A3',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1.05 }],
  },
  filterText: { 
    color: '#64748B', 
    fontWeight: '700', 
    fontSize: 13,
    textAlign: 'center',
  },
  filterTextActive: { 
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  listContainer: { padding: 16 },
  clientCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 2 },
  clientEmail: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  clientDoc: { fontSize: 12, color: '#9CA3AF' },
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  amountContainer: { flex: 1 },
  amountLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  amountValue: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  payButton: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  payButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 18, color: '#6B7280' },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 3,
    borderColor: '#fff',
    transform: [{ scale: 1 }],
  },
  fabIcon: { 
    fontSize: 30, 
    color: '#fff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  modalClose: { fontSize: 28, color: '#6B7280' },
  formContainer: { padding: 20 },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  phonePrefix: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  planSelector: {
    marginBottom: 16,
  },
  planLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  planOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  planChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  planChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  planChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  planChipTextActive: {
    color: '#4F46E5',
  },
});
