// src/screens/Clients/ClientsScreen.js - CON WHATSAPP
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
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../../context/DatabaseContext';
import { theme } from '../../constants/theme';

export default function ClientsScreen({ navigation, route }) {
  const { clients } = useDatabase();
  const [clientsList, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(route.params?.status || '');
  const [showModal, setShowModal] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Pantalla Clientes enfocada - Recargando datos...');
      loadClients();
    }, [statusFilter, searchTerm])
  );

  useEffect(() => {
    if (route.params?.status !== undefined) {
      setStatusFilter(route.params.status);
    }
  }, [route.params?.status]);

  const loadClients = async () => {
    try {
      const all = await clients.getAll();
      let filtered = all;
      if (statusFilter) {
        filtered = filtered.filter(c => c.estadoPago === statusFilter);
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        filtered = filtered.filter(c =>
          c.nombre.toLowerCase().includes(q) ||
          c.apellido.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.documento.includes(searchTerm)
        );
      }
      setClients(filtered);
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
      'Confirmar Abono',
      '¿Marcar como abonado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await clients.updatePaymentStatus(clientId, 'pagado');
              Alert.alert('Éxito', 'Cliente marcado como abonado');
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
      pagado: { label: 'Al día', icon: 'checkmark-circle', color: '#10B981', bgColor: '#052E16' },
      vencido: { label: 'Vencido', icon: 'alert-circle', color: '#EF4444', bgColor: '#450A0A' },
      pendiente: { label: 'Pendiente', icon: 'time', color: '#F59E0B', bgColor: '#422006' },
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
          if (!idToUse) {
            Alert.alert('Error', 'ID de cliente no válido');
            return;
          }
          navigation.navigate('ClientDetail', { clientId: idToUse });
        }}
        activeOpacity={0.75}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.avatarCircle, { borderColor: badge.color }]}>
            <Text style={styles.avatarInitial}>
              {item.nombre.charAt(0)}{item.apellido.charAt(0)}
            </Text>
          </View>

          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{item.nombre} {item.apellido}</Text>
            <View style={styles.clientMeta}>
              <View style={[styles.planTag, { backgroundColor: badge.bgColor }]}>
                <Text style={[styles.planTagText, { color: badge.color }]}>
                  {(item.tipoPlan || 'mensual').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.clientDoc}>DNI {item.documento}</Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: badge.bgColor, borderColor: badge.color + '60' }]}>
            <Ionicons name={badge.icon} size={12} color={badge.color} />
            <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.cardDivider, { backgroundColor: badge.color + '25' }]} />

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.amountLabel}>Cuota</Text>
            <Text style={styles.amountValue}>${item.montoMensual?.toLocaleString()}</Text>
          </View>

          {item.estadoPago !== 'pagado' ? (
            <TouchableOpacity
              style={[styles.payButton, { backgroundColor: badge.color + '18', borderColor: badge.color }]}
              onPress={(e) => {
                e.stopPropagation();
                markAsPaid(item.id || item._id);
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={14} color={badge.color} style={{ marginRight: 4 }} />
              <Text style={[styles.payButtonText, { color: badge.color }]}>Abonar</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.paidIndicator}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={styles.paidText}>Al día</Text>
            </View>
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
          <Ionicons name="search" size={18} color="#71717A" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar cliente..."
            placeholderTextColor="#71717A"
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
          />
        </View>
        <TouchableOpacity style={styles.importBtn} onPress={() => navigation.navigate('ImportContacts')}>
          <Ionicons name="person-add-outline" size={20} color="#F97316" />
        </TouchableOpacity>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.navContainer}>
        {[
          { label: 'Todos', value: '' },
          { label: 'Al día', value: 'pagado' },
          { label: 'Vencidos', value: 'vencido' },
          { label: 'Pendientes', value: 'pendiente' },
        ].map(({ label, value }) => (
          <TouchableOpacity
            key={value}
            style={[styles.navChip, statusFilter === value && styles.navChipActive]}
            onPress={() => setStatusFilter(value)}
          >
            <Text style={[styles.navText, statusFilter === value && styles.navTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
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
            <Ionicons name="barbell-outline" size={64} color="#3F3F46" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No hay clientes</Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
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

function CreateClientModal({ visible, onClose, onSuccess }) {
  const { clients } = useDatabase();
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    documento: '',
    telefono: '',
    tipoPlan: 'mensual',
    montoMensual: '3500',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.nombre || !formData.apellido || !formData.email || !formData.documento) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    if (formData.nombre.trim().length < 2) {
      Alert.alert('Error', 'El nombre debe tener al menos 2 caracteres');
      return;
    }

    if (formData.apellido.trim().length < 2) {
      Alert.alert('Error', 'El apellido debe tener al menos 2 caracteres');
      return;
    }

    const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ'\s]+$/;
    if (!nombreRegex.test(formData.nombre.trim())) {
      Alert.alert('Error', 'El nombre no puede contener números o caracteres especiales');
      return;
    }

    if (!nombreRegex.test(formData.apellido.trim())) {
      Alert.alert('Error', 'El apellido no puede contener números o caracteres especiales');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    const dniRegex = /^\d{8}$/;
    if (!dniRegex.test(formData.documento)) {
      Alert.alert('Error', 'El DNI debe tener exactamente 8 dígitos numéricos');
      return;
    }

    const monto = parseFloat(formData.montoMensual);
    if (isNaN(monto) || monto <= 0) {
      Alert.alert('Error', 'El monto debe ser mayor a 0');
      return;
    }

    if (monto < 100) {
      Alert.alert('Error', 'El monto debe ser al menos $100');
      return;
    }

    if (monto > 1000000) {
      Alert.alert('Error', 'El monto no puede superar $1,000,000');
      return;
    }

    if (formData.telefono.trim()) {
      let telefono = formData.telefono.trim();
      
      if (!telefono.startsWith('+54')) {
        telefono = telefono.replace(/[^0-9]/g, '');
        telefono = '+54' + telefono;
      }
      
      const telefonoRegex = /^\+54\d{9,}$/;
      if (!telefonoRegex.test(telefono)) {
        Alert.alert('Error', 'El teléfono debe tener formato +54 seguido de al menos 9 dígitos');
        return;
      }
      
      formData.telefono = telefono;
    }

    if (formData.email) {
      Alert.alert(
        '✉️ Email Registrado',
        `Este email se usará para:\n\n` +
        `• Enviar invitaciones de Google Calendar\n` +
        `• Notificar cambios en rutinas\n` +
        `• Recordatorios de entrenamiento\n\n` +
        `Verifica que sea correcto:\n${formData.email}`,
        [
          { text: 'Corregir', style: 'cancel' },
          { text: 'Es Correcto', onPress: () => crearCliente() }
        ]
      );
    } else {
      crearCliente();
    }
  };

  const crearCliente = async () => {
    setLoading(true);
    try {
      const isEmailUnique = await clients.validateUniqueEmail(formData.email.toLowerCase().trim());
      if (!isEmailUnique) {
        Alert.alert('Error', 'Ya existe un cliente activo con ese email');
        setLoading(false);
        return;
      }

      const isDNIUnique = await clients.validateUniqueDocumento(formData.documento.trim());
      if (!isDNIUnique) {
        Alert.alert('Error', 'Ya existe un cliente activo con ese DNI');
        setLoading(false);
        return;
      }

      await clients.create({
        ...formData,
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        email: formData.email.toLowerCase().trim(),
        documento: formData.documento.trim(),
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
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboardView}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nuevo Cliente</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.modalCloseButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color="#A1A1AA" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.formContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Información Personal */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Información Personal</Text>
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre *"
                    value={formData.nombre}
                    onChangeText={(text) => setFormData({ ...formData, nombre: text })}
                    placeholderTextColor="#71717A"
                  />
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Apellido *"
                    value={formData.apellido}
                    onChangeText={(text) => setFormData({ ...formData, apellido: text })}
                    placeholderTextColor="#71717A"
                  />
                  
                  <TextInput
                    style={styles.input}
                    placeholder="DNI * (8 dígitos)"
                    value={formData.documento}
                    onChangeText={(text) => {
                      const numbersOnly = text.replace(/[^0-9]/g, '');
                      if (numbersOnly.length <= 8) {
                        setFormData({ ...formData, documento: numbersOnly });
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={8}
                    placeholderTextColor="#71717A"
                  />
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Email *"
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#71717A"
                  />
                </View>

                {/* Información de Contacto */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Contacto</Text>
                  
                  <View style={styles.phoneContainer}>
                    <Text style={styles.phonePrefix}>+54</Text>
                    <TextInput
                      style={[styles.input, styles.phoneInput]}
                      placeholder="Número de celular (ej: 1123456789)"
                      value={formData.telefono.replace('+54', '')}
                      onChangeText={(text) => {
                        const numbersOnly = text.replace(/[^0-9]/g, '');
                        setFormData({ ...formData, telefono: numbersOnly ? '+54' + numbersOnly : '' });
                      }}
                      keyboardType="phone-pad"
                      maxLength={15}
                      placeholderTextColor="#71717A"
                    />
                  </View>
                </View>

                {/* Información del Plan */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Plan y Cuota</Text>
                  
                  <View style={styles.planSelector}>
                    <Text style={styles.planLabel}>Tipo de Plan *</Text>
                    <View style={styles.planOptions}>
                      {['diario', 'semanal', 'quincenal', 'mensual', 'anual'].map((plan) => (
                        <TouchableOpacity
                          key={plan}
                          style={[styles.planChip, formData.tipoPlan === plan && styles.planChipActive]}
                          onPress={() => setFormData({ ...formData, tipoPlan: plan })}
                        >
                          <Text style={[styles.planChipText, formData.tipoPlan === plan && styles.planChipTextActive]}>
                            {plan.charAt(0).toUpperCase() + plan.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="Cuota Mensual *"
                    value={formData.montoMensual}
                    onChangeText={(text) => {
                      const numbersOnly = text.replace(/[^0-9]/g, '');
                      setFormData({ ...formData, montoMensual: numbersOnly });
                    }}
                    keyboardType="numeric"
                    placeholderTextColor="#71717A"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? 'Validando...' : 'Crear Cliente'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: '#F5F5F5' },
  importBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#431407',
    borderWidth: 1,
    borderColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Navigation Tabs
  navContainer: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  navChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  navChipActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  navText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#71717A',
  },
  navTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  listContainer: { padding: 12 },
  clientCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
  },
  avatarInitial: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '700', color: '#F5F5F5', marginBottom: 5 },
  clientMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  planTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  clientDoc: { fontSize: 12, color: '#71717A' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDivider: { height: 1, marginBottom: 10 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: { fontSize: 11, color: '#71717A', marginBottom: 2 },
  amountValue: { fontSize: 17, fontWeight: '800', color: '#F5F5F5' },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  payButtonText: { fontWeight: '700', fontSize: 13 },
  paidIndicator: { flexDirection: 'row', alignItems: 'center' },
  paidText: { fontSize: 13, color: '#10B981', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 18, color: '#A1A1AA' },
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalKeyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.text.primary },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#2C2C2E',
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: { padding: 20 },
  sectionContainer: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  phonePrefix: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    marginRight: 8,
    minWidth: 60,
    textAlign: 'center',
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
  },
  submitButton: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 30,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#EA6C0A',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  planSelector: {
    marginBottom: 16,
  },
  planLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F5F5',
    marginBottom: 12,
  },
  planOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  planChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  planChipActive: {
    backgroundColor: '#431407',
    borderColor: theme.colors.primary,
  },
  planChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  planChipTextActive: {
    color: theme.colors.primary,
  },
});