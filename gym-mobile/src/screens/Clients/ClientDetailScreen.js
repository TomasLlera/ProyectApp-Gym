// src/screens/Clients/ClientDetailScreen.js
import React, { useState, useEffect } from 'react';
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
import { clientsAPI } from '../../api/axios';

export default function ClientDetailScreen({ route, navigation }) {
  const { clientId } = route.params;
  const [client, setClient] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadClientData();
  }, []);

  const loadClientData = async () => {
    try {
      const { data } = await clientsAPI.getById(clientId);
      setClient(data.data.client);
      setPayments(data.data.payments || []);
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
      `Hola ${client.nombre}! Te recordamos que tu cuota mensual de $${client.montoMensual} está ${
        client.estadoPago === 'vencido' ? 'vencida' : 'pendiente'
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
              await clientsAPI.delete(clientId);
              Alert.alert('Éxito', 'Cliente eliminado', [
                { text: 'OK', onPress: () => navigation.navigate('Clientes', { refresh: Date.now() }) }
              ]);
            } catch (error) {
              console.error('Error deleting client:', error);
              Alert.alert('Error', error.response?.data?.error || 'No se pudo eliminar el cliente');
            }
          }
        }
      ]
    );
  };

  const changePaymentStatus = () => {
    const options = [
      { text: 'Cancelar', style: 'cancel' },
      { text: '✅ Marcar como Pagado', onPress: () => updatePaymentStatus('pagado') },
      { text: '⚠️ Marcar como Vencido', onPress: () => updatePaymentStatus('vencido') },
      { text: '⏳ Marcar como Pendiente', onPress: () => updatePaymentStatus('pendiente') },
    ];

    Alert.alert('Cambiar Estado de Pago', 'Selecciona el nuevo estado:', options);
  };

  const updatePaymentStatus = async (status) => {
    try {
      await clientsAPI.updatePayment(clientId, status);
      Alert.alert('Éxito', 'Estado actualizado');
      setTimeout(() => loadClientData(), 300);
    } catch (error) {
      console.error('Error updating payment:', error);
      Alert.alert('Error', error.response?.data?.error || 'No se pudo actualizar el estado');
    }
  };

  const getStatusColor = (status) => {
    const colors = { pagado: '#10B981', vencido: '#EF4444', pendiente: '#F59E0B' };
    return colors[status] || colors.pendiente;
  };

  const getStatusLabel = (status) => {
    const labels = { pagado: '✅ Al día', vencido: '⚠️ Vencido', pendiente: '⏳ Pendiente' };
    return labels[status] || labels.pendiente;
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
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{client.nombre.charAt(0)}{client.apellido.charAt(0)}</Text>
        </View>
        <Text style={styles.clientName}>{client.nombre} {client.apellido}</Text>
        <Text style={styles.clientEmail}>{client.email}</Text>

        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: getStatusColor(client.estadoPago) }]}
          onPress={changePaymentStatus}
        >
          <Text style={styles.statusText}>{getStatusLabel(client.estadoPago)}</Text>
          <Text style={styles.statusHint}>(toca para cambiar)</Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#3B82F6' }]} onPress={() => setShowEditModal(true)}>
          <Text style={styles.actionButtonText}>✏️ Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#F97316' }]} onPress={sendEmail}>
          <Text style={styles.actionButtonText}>📧 Email</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10B981' }]} onPress={sendWhatsApp}>
          <Text style={styles.actionButtonText}>💬 WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#EF4444' }]} onPress={deleteClient}>
          <Text style={styles.actionButtonText}>🗑️ Eliminar</Text>
        </TouchableOpacity>
      </View>

      {/* Client Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información</Text>

        <InfoRow label="DNI" value={client.documento} />
        <InfoRow label="Teléfono" value={client.telefono || 'No registrado'} />
        <InfoRow label="Email" value={client.email} />
        <InfoRow label="Fecha de registro" value={new Date(client.fechaRegistro).toLocaleDateString('es-AR')} />
        <InfoRow
          label="Último pago"
          value={client.fechaUltimoPago ? new Date(client.fechaUltimoPago).toLocaleDateString('es-AR') : 'Sin pagos'}
        />
        <InfoRow
          label="Fecha de vencimiento"
          value={client.fechaVencimiento ? new Date(client.fechaVencimiento).toLocaleDateString('es-AR') : 'No registrada'}
        />
        <InfoRow
          label="Estado vencimiento"
          value={getVencimientoInfo(client.fechaVencimiento)}
        />
        <InfoRow label="Cuota mensual" value={`$${client.montoMensual?.toLocaleString()}`} highlight />
      </View>

      {/* Payment History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Historial de Pagos ({payments.length})</Text>
        {payments.length === 0 ? (
          <View style={styles.emptyPayments}>
            <Text style={styles.emptyEmoji}>💰</Text>
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

      {/* Edit Modal */}
      <EditClientModal
        visible={showEditModal}
        client={client}
        navigation={navigation}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => { setShowEditModal(false); loadClientData(); }}
      />
    </ScrollView>
  );
}

// InfoRow Component
function InfoRow({ label, value, highlight }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>{value}</Text>
    </View>
  );
}

// Edit Modal Component
function EditClientModal({ visible, client, navigation, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nombre: client?.nombre || '',
    apellido: client?.apellido || '',
    email: client?.email || '',
    documento: client?.documento || '',
    telefono: client?.telefono || '',
    montoMensual: client?.montoMensual?.toString() || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({
        nombre: client.nombre,
        apellido: client.apellido,
        email: client.email,
        documento: client.documento,
        telefono: client.telefono || '',
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
      await clientsAPI.update(client._id, { ...formData, montoMensual: parseFloat(formData.montoMensual) });
      Alert.alert('Éxito', '✅ Cliente actualizado exitosamente');
      onSuccess();
      navigation.setParams({ updated: Date.now() });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Error al actualizar cliente');
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
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <TextInput style={styles.input} placeholder="Nombre *" value={formData.nombre} onChangeText={(text) => setFormData({ ...formData, nombre: text })} />
            <TextInput style={styles.input} placeholder="Apellido *" value={formData.apellido} onChangeText={(text) => setFormData({ ...formData, apellido: text })} />
            <TextInput style={styles.input} placeholder="Email *" value={formData.email} onChangeText={(text) => setFormData({ ...formData, email: text })} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="DNI *" value={formData.documento} onChangeText={(text) => setFormData({ ...formData, documento: text })} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Teléfono" value={formData.telefono} onChangeText={(text) => setFormData({ ...formData, telefono: text })} keyboardType="phone-pad" />
            <TextInput style={styles.input} placeholder="Monto Mensual *" value={formData.montoMensual} onChangeText={(text) => setFormData({ ...formData, montoMensual: text })} keyboardType="numeric" />

            <TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.submitButtonText}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  clientEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusHint: {
    color: '#fff',
    fontSize: 10,
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoValueHighlight: {
    fontSize: 18,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
  emptyPayments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  paymentDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalClose: {
    fontSize: 28,
    color: '#6B7280',
  },
  formContainer: {
    padding: 20,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    color: '#1F2937',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});