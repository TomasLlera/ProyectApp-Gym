// src/screens/Dashboard/DashboardScreen.js
import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { clientsAPI, paymentsAPI, notificationsAPI } from '../../api/axios';

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [overdueClients, setOverdueClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 🔥 AUTO-REFRESH: Se ejecuta cada vez que la pantalla toma foco
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [statsRes, overdueRes] = await Promise.all([
        clientsAPI.getStats(),
        paymentsAPI.getOverdue()
      ]);
      
      setStats(statsRes.data.data.resumen);
      setOverdueClients(overdueRes.data.data.clients);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const sendReminders = () => {
    if (overdueClients.length === 0) {
      Alert.alert('Info', 'No hay clientes con pagos vencidos');
      return;
    }
    
    Alert.alert(
      'Enviar Recordatorios WhatsApp',
      `¿Enviar recordatorio por WhatsApp a ${overdueClients.length} clientes vencidos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Enviar', 
          onPress: handleSendReminders
        }
      ]
    );
  };

  const handleSendReminders = async () => {
    try {
      // Mostrar loading
      Alert.alert('Enviando...', 'Enviando recordatorios por WhatsApp');
      
      // Llamar a la API para enviar a todos los vencidos
      const response = await notificationsAPI.enviarVencidos();
      
      if (response.data.success) {
        const { message, data } = response.data;
        const enviados = data.filter(r => r.estado === 'enviado').length;
        const errores = data.filter(r => r.estado === 'error').length;
        
        let alertMessage = `✅ ${enviados} mensajes enviados exitosamente`;
        if (errores > 0) {
          alertMessage += `\n⚠️ ${errores} mensajes fallaron`;
        }
        
        Alert.alert('Recordatorios Enviados', alertMessage);
        
        // Recargar datos para actualizar la vista
        loadData();
      } else {
        Alert.alert('Error', 'No se pudieron enviar los recordatorios');
      }
    } catch (error) {
      console.error('Error enviando recordatorios:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar los recordatorios');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Clientes"
          value={stats?.totalClientes || 0}
          icon="👥"
          color="#3B82F6"
        />
        <StatCard
          title="Al Día"
          value={stats?.clientesPagados || 0}
          icon="✅"
          color="#10B981"
        />
        <StatCard
          title="Vencidos"
          value={stats?.clientesVencidos || 0}
          icon="⚠️"
          color="#EF4444"
          onPress={() => navigation.navigate('Clientes', { status: 'vencido' })}
        />
        <StatCard
          title="Ingresos"
          value={`$${(stats?.ingresosMes || 0).toLocaleString()}`}
          icon="💰"
          color="#8B5CF6"
        />
      </View>

      {/* Send Reminders Button */}
      {overdueClients.length > 0 && (
        <TouchableOpacity style={styles.reminderButton} onPress={sendReminders}>
          <Text style={styles.reminderButtonText}>
            📢 Enviar Recordatorios ({overdueClients.length})
          </Text>
        </TouchableOpacity>
      )}

      {/* Overdue Clients */}
      {overdueClients.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Clientes con Pago Vencido ({overdueClients.length})
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Clientes', { status: 'vencido' })}>
              <Text style={styles.seeAllText}>Ver todos →</Text>
            </TouchableOpacity>
          </View>

          {overdueClients.slice(0, 5).map((client) => (
            <TouchableOpacity
              key={client._id}
              style={styles.clientCard}
              onPress={() => navigation.navigate('ClientDetail', { clientId: client._id })}
            >
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>
                  {client.nombre} {client.apellido}
                </Text>
                <Text style={styles.clientEmail}>{client.email}</Text>
              </View>
              <View style={styles.clientAmount}>
                <Text style={styles.amountText}>${client.montoMensual}</Text>
                <Text style={styles.overdueText}>Vencido</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ title, value, icon, color, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Fondo más neutro
  },

  // ⏳ Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },

  // 📊 Grid de estadísticas
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 14,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '47%',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  statIcon: {
    fontSize: 36,
    marginBottom: 6,
    textAlign: 'left',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },

  // 🔔 Botón de recordatorios
  reminderButton: {
    backgroundColor: '#F97316',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  reminderButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // 📋 Sección de vencidos
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  seeAllText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },

  // 👤 Tarjetas de clientes
  clientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  clientEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  clientAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  overdueText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
    marginTop: 2,
  },
});
