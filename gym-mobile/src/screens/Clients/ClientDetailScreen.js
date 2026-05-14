// src/screens/Clients/ClientDetailScreen.js
import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clientsAPI, calendarAPI } from '../../api/axios';
import { useDatabase } from '../../context/DatabaseContext';

export default function ClientDetailScreen({ route, navigation }) {
  const { clientId } = route.params;

  const [client, setClient] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [uploadingCalendar, setUploadingCalendar] = useState(false);

  // AGREGAR ESTO
  const { clients } = useDatabase();

  // 🔥 AUTO-REFRESH: Cargar datos al entrar a la pantalla
  useFocusEffect(
    React.useCallback(() => {
      loadClientData();
    }, [clientId])
  );

  const loadClientData = async () => {
    try {
      // Primero intentar desde SQLite
      const clientData = await clients.getById(clientId);

      if (clientData) {
        setClient(clientData);
        console.log('✅ Cliente cargado desde SQLite');
      } else {
        // Si no está en SQLite, intentar desde API
        const { data } = await clientsAPI.getById(clientId);
        setClient(data.data.client);
        setPayments(data.data.payments || []);
        console.log('✅ Cliente cargado desde API');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = () => {
    if (!client.email) return;

    const subject = encodeURIComponent('Recordatorio de Pago - Gimnasio');
    const body = encodeURIComponent(
      `Hola ${client.nombre},\n\nTe recordamos que tu cuota mensual está ${client.estadoPago}.\n\nMonto: $${client.montoMensual}\n\n¡Esperamos verte pronto!`
    );

    Linking.openURL(`mailto:${client.email}?subject=${subject}&body=${body}`);
  };

  const sendWhatsApp = () => {
    if (!client.telefono) {
      Alert.alert('Error', 'El cliente no tiene teléfono registrado');
      return;
    }

    const message = encodeURIComponent(
      `Hola ${client.nombre}! Te recordamos que tu cuota mensual de $${client.montoMensual} está ${client.estadoPago === 'vencido' ? 'vencida' : 'pendiente'
      }. ¡Esperamos verte pronto en el gym! 🏋️`
    );

    const phone = client.telefono.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${phone}?text=${message}`);
  };

  const deleteClient = () => {
    Alert.alert(
      'Eliminar Cliente',
      '¿Estás seguro de eliminar este cliente?\n\nEsta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Usar SQLite en lugar de API
              await clients.delete(clientId);
              Alert.alert('Éxito', 'Cliente eliminado', [
                { text: 'OK', onPress: () => navigation.navigate('Clientes', { refresh: Date.now() }) }
              ]);
            } catch (error) {
              console.error('Error deleting client:', error);
              Alert.alert('Error', 'No se pudo eliminar el cliente');
            }
          }
        }
      ]
    );
  };

  const changePaymentStatus = () => {
    setShowStatusModal(true);
  };

  const updatePaymentStatus = async (status) => {
    try {
      // Actualizar en SQLite
      await clients.updatePaymentStatus(clientId, status);
      Alert.alert('Éxito', 'Estado actualizado');

      // Recargar datos
      setTimeout(() => loadClientData(), 300);
    } catch (error) {
      console.error('Error actualizando pago:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const subirRutinasACalendar = async () => {
    if (!client) return;

    Alert.alert(
      'Subir a Google Calendar',
      `¿Enviar todas las rutinas de ${client.nombre} a su Google Calendar?\n\nEl cliente recibirá los eventos en su email.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            setUploadingCalendar(true);
            try {
              const response = await calendarAPI.subirTodas(clientId);

              Alert.alert(
                '✅ Éxito',
                `${response.data.data.totalEventos} eventos creados en Google Calendar\n\n${response.data.data.detalles
                  .map(d => `✓ ${d.rutina}: ${d.eventos} eventos`)
                  .join('\n')}`
              );
            } catch (error) {
              console.error('Error:', error);
              Alert.alert(
                '❌ Error',
                error.response?.data?.error || 'No se pudieron subir las rutinas a Google Calendar'
              );
            } finally {
              setUploadingCalendar(false);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    const colors = { pagado: '#10B981', vencido: '#EF4444', pendiente: '#F59E0B' };
    return colors[status] || colors.pendiente;
  };

  const getStatusLabel = (status) => {
    const labels = { pagado: 'Al día', vencido: 'Vencido', pendiente: 'Pendiente' };
    return labels[status] || labels.pendiente;
  };

  const getStatusIcon = (status) => {
    const icons = { pagado: 'checkmark-circle', vencido: 'alert-circle', pendiente: 'time' };
    return icons[status] || icons.pendiente;
  };

  const getVencimientoInfo = (fechaVencimiento) => {
    if (!fechaVencimiento) return 'No registrada';
    const hoy = new Date();
    const venc = new Date(fechaVencimiento);
    const diffDays = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));

    if (diffDays > 0) return `Vence en ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    if (diffDays === 0) return 'Vence hoy';
    return `Vencido hace ${Math.abs(diffDays)} día${Math.abs(diffDays) > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Client Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, {
          borderColor: getStatusColor(client.estadoPago),
          borderWidth: 3
        }]}>
          <Text style={styles.avatarText}>{client.nombre.charAt(0)}{client.apellido.charAt(0)}</Text>
        </View>
        <Text style={styles.clientName}>{client.nombre} {client.apellido}</Text>
        <Text style={styles.clientEmail}>{client.email}</Text>

        <TouchableOpacity
          style={[styles.statusBadge, {
            backgroundColor: getStatusColor(client.estadoPago) + '22',
            borderColor: getStatusColor(client.estadoPago),
            shadowColor: getStatusColor(client.estadoPago),
          }]}
          onPress={changePaymentStatus}
          activeOpacity={0.75}
        >
          <Ionicons name={getStatusIcon(client.estadoPago)} size={20} color={getStatusColor(client.estadoPago)} />
          <Text style={[styles.statusText, { color: getStatusColor(client.estadoPago) }]}>
            {getStatusLabel(client.estadoPago)}
          </Text>
          <Ionicons name="chevron-down" size={14} color={getStatusColor(client.estadoPago) + 'AA'} style={{ marginLeft: 2 }} />
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.actionBtn, { borderColor: '#1E40AF' }]} onPress={() => setShowEditModal(true)}>
          <Ionicons name="create-outline" size={20} color="#3B82F6" />
          <Text style={[styles.actionBtnLabel, { color: '#3B82F6' }]}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { borderColor: '#6D28D9' }]} onPress={subirRutinasACalendar} disabled={uploadingCalendar}>
          <Ionicons name={uploadingCalendar ? 'time-outline' : 'calendar-outline'} size={20} color="#8B5CF6" />
          <Text style={[styles.actionBtnLabel, { color: '#8B5CF6' }]}>Calendar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { borderColor: '#C2410C' }]} onPress={sendEmail}>
          <Ionicons name="mail-outline" size={20} color="#F97316" />
          <Text style={[styles.actionBtnLabel, { color: '#F97316' }]}>Email</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { borderColor: '#047857' }]} onPress={sendWhatsApp}>
          <Ionicons name="logo-whatsapp" size={20} color="#10B981" />
          <Text style={[styles.actionBtnLabel, { color: '#10B981' }]}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, { borderColor: '#B91C1C' }]} onPress={deleteClient}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={[styles.actionBtnLabel, { color: '#EF4444' }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      {/* Client Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>

        <InfoRow label="DNI" value={client.documento} />
        <InfoRow label="Teléfono" value={client.telefono || 'No registrado'} />
        <InfoRow label="Plan" value={client.tipoPlan?.toUpperCase() || 'MENSUAL'} />
        <InfoRow label="Vencimiento" value={getVencimientoInfo(client.fechaVencimiento)} />
        <InfoRow label="Cuota mensual" value={`$${client.montoMensual?.toLocaleString()}`} highlight />
      </View>

      {/* Payment History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historial de Pagos ({payments.length})</Text>
        {payments.length === 0 ? (
          <View style={styles.emptyPayments}>
            <Ionicons name="cash-outline" size={48} color="#3F3F46" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>Sin pagos registrados</Text>
          </View>
        ) : (
          payments.map((payment) => (
            <View key={payment._id} style={styles.paymentCard}>
              <View>
                <Text style={styles.paymentDate}>
                  {new Date(payment.fecha).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
                <Text style={styles.paymentMethod}>{payment.metodoPago || 'Efectivo'} • {payment.estado}</Text>
              </View>
              <Text style={styles.paymentAmount}>${payment.monto?.toLocaleString()}</Text>
            </View>
          ))
        )}
      </View>

      {/* Status Modal */}
      <Modal
        visible={showStatusModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStatusModal(false)}
      >
        <TouchableOpacity
          style={styles.statusModalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
            <View style={styles.statusModalContent}>
              <View style={styles.statusModalHandle} />
              <Text style={styles.statusModalTitle}>Estado de pago</Text>
              <Text style={styles.statusModalSubtitle}>{client?.nombre} {client?.apellido}</Text>

              {[
                { value: 'pagado',   label: 'Al día',    desc: 'El cliente está al corriente',       icon: 'checkmark-circle', color: '#10B981', bg: '#052E16' },
                { value: 'pendiente', label: 'Pendiente', desc: 'Pago pendiente de confirmación',     icon: 'time',             color: '#F59E0B', bg: '#422006' },
                { value: 'vencido',  label: 'Vencido',   desc: 'La cuota venció sin pago',           icon: 'alert-circle',     color: '#EF4444', bg: '#450A0A' },
              ].map(({ value, label, desc, icon, color, bg }) => {
                const isCurrent = client?.estadoPago === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.statusOption, { borderColor: isCurrent ? color : '#2C2C2E', backgroundColor: isCurrent ? bg : '#1C1C1E' }]}
                    onPress={() => {
                      setShowStatusModal(false);
                      updatePaymentStatus(value);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.statusOptionIcon, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                      <Ionicons name={icon} size={22} color={color} />
                    </View>
                    <View style={styles.statusOptionInfo}>
                      <Text style={[styles.statusOptionLabel, { color: isCurrent ? color : '#F5F5F5' }]}>{label}</Text>
                      <Text style={styles.statusOptionDesc}>{desc}</Text>
                    </View>
                    {isCurrent && (
                      <Ionicons name="checkmark-circle" size={20} color={color} />
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity style={styles.statusModalCancel} onPress={() => setShowStatusModal(false)}>
                <Text style={styles.statusModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <EditClientModal
        visible={showEditModal}
        client={client}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {
          setShowEditModal(false);
          // 🔥 Recargar datos automáticamente después de editar
          loadClientData();
        }}
      />
    </ScrollView>
  );
}

// InfoRow Component
function InfoRow({ label, value, highlight }) {
  return (
    <View style={[styles.infoRow, highlight && styles.infoRowHighlight]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>{value}</Text>
    </View>
  );
}

// Edit Modal Component
function EditClientModal({ visible, client, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nombre: client?.nombre || '',
    apellido: client?.apellido || '',
    email: client?.email || '',
    documento: client?.documento || '',
    telefono: client?.telefono || '',
    tipoPlan: client?.tipoPlan || 'mensual',
    montoMensual: client?.montoMensual?.toString() || '',
  });
  const [loading, setLoading] = useState(false);
  const { clients } = useDatabase();  // AGREGAR ESTO

  useEffect(() => {
    if (client) {
      setFormData({
        nombre: client.nombre,
        apellido: client.apellido,
        email: client.email,
        documento: client.documento,
        telefono: client.telefono || '',
        tipoPlan: client.tipoPlan || 'mensual',
        montoMensual: client.montoMensual.toString(),
      });
    }
  }, [client]);

  const handleSubmit = async () => {
    if (!formData.nombre || !formData.apellido || !formData.email || !formData.documento) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      // Intentar actualizar en SQLite primero
      await clients.update(client._id || client.id, {
        ...formData,
        montoMensual: parseFloat(formData.montoMensual)
      });

      Alert.alert('Éxito', '✅ Cliente actualizado exitosamente');
      onSuccess();
    } catch (error) {
      console.error('Error actualizando:', error);
      Alert.alert('Error', 'No se pudo actualizar el cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Cliente</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
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
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#A1A1AA' },
  header: {
    backgroundColor: '#1A1A1A',  // Negro O2
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#F97316',  // Naranja O2
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F97316',  // Naranja O2
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#EA6C0A',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: { fontSize: 32, color: '#FFFFFF', fontWeight: 'bold' },
  clientName: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  clientEmail: { fontSize: 14, color: '#F97316', marginBottom: 12 },  // Naranja claro
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  statusText: { fontSize: 16, fontWeight: '800' },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  actionBtnLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#1C1C1E',
    margin: 16,
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#F5F5F5', marginBottom: 16 },  // Negro O2
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    paddingHorizontal: 4,
  },
  infoRowHighlight: {
    backgroundColor: '#1A2A1A',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderBottomColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#16A34A',
  },
  infoLabel: { fontSize: 14, color: '#A1A1AA', fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#F5F5F5' },
  infoValueHighlight: { fontSize: 18, color: '#16A34A', fontWeight: 'bold' },
  emptyPayments: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, color: '#A1A1AA' },
  paymentCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0F0F0F', padding: 16, borderRadius: 8, marginBottom: 8 },
  paymentDate: { fontSize: 14, fontWeight: '600', color: '#F5F5F5', marginBottom: 4 },
  paymentMethod: { fontSize: 12, color: '#A1A1AA' },
  paymentAmount: { fontSize: 20, fontWeight: 'bold', color: '#10B981' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#F5F5F5' },
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
    backgroundColor: '#0F0F0F',
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
  planSelector: { marginBottom: 16 },
  planLabel: { fontSize: 14, fontWeight: '600', color: '#F5F5F5', marginBottom: 12 },
  planOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  planChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3F3F46'
  },
  planChipActive: {
    backgroundColor: '#431407',
    borderColor: '#F97316'
  },
  planChipText: { fontSize: 13, fontWeight: '600', color: '#A1A1AA' },
  planChipTextActive: { color: '#F97316', fontWeight: '700' },
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

  // Status modal
  statusModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  statusModalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: 3,
    borderTopColor: '#F97316',
  },
  statusModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#3F3F46',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  statusModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5F5F5',
    marginBottom: 4,
  },
  statusModalSubtitle: {
    fontSize: 13,
    color: '#71717A',
    marginBottom: 20,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    gap: 14,
  },
  statusOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOptionInfo: { flex: 1 },
  statusOptionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  statusOptionDesc: { fontSize: 12, color: '#71717A' },
  statusModalCancel: {
    marginTop: 6,
    padding: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
  },
  statusModalCancelText: { fontSize: 15, fontWeight: '600', color: '#A1A1AA' },
});