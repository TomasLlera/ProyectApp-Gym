// src/screens/Dashboard/DashboardScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { clientsAPI, paymentsAPI } from '../../api/axios';

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [overdueClients, setOverdueClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

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
      'Enviar Recordatorios',
      `¿Enviar recordatorio a ${overdueClients.length} clientes?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Enviar', 
          onPress: () => Alert.alert('Éxito', 'Recordatorios enviados (Funcionalidad en desarrollo)')
        }
      ]
    );
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Resumen general</Text>
      </View>

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
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  reminderButton: {
    backgroundColor: '#F97316',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  reminderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  seeAllText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  clientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
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
    fontSize: 10,
    color: '#DC2626',
    marginTop: 2,
  },
});