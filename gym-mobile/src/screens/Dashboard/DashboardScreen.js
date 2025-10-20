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
import { useDatabase } from '../../context/DatabaseContext';

export default function DashboardScreen({ navigation }) {
  const { clients, payments } = useDatabase();
  const [stats, setStats] = useState(null);
  const [paidClients, setPaidClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaidDetails, setShowPaidDetails] = useState(false);

  // 🔥 AUTO-REFRESH: Se ejecuta cada vez que la pantalla toma foco
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // Obtener estadísticas desde SQLite
      const allClients = await clients.getAll();
      
      const clientesPagados = allClients.filter(c => c.estadoPago === 'pagado').length;
      const clientesVencidos = allClients.filter(c => c.estadoPago === 'vencido').length;
      const clientesPendientes = allClients.filter(c => c.estadoPago === 'pendiente').length;
      const ingresosMes = allClients
        .filter(c => c.estadoPago === 'pagado')
        .reduce((sum, c) => sum + (c.montoMensual || 0), 0);

      // Obtener clientes que pagaron (en lugar de vencidos)
      const clientesPagadosRecientes = allClients.filter(c => c.estadoPago === 'pagado');

      setStats({
        totalClientes: allClients.length,
        clientesPagados,
        clientesVencidos,
        clientesPendientes,
        ingresosMes
      });
      
      // Cambiar a clientes pagados en lugar de vencidos
      setPaidClients(clientesPagadosRecientes);
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
    // Obtener clientes vencidos para recordatorios
    const vencidos = paidClients.filter(c => c.estadoPago === 'vencido');
    
    if (vencidos.length === 0) {
      Alert.alert('Info', 'No hay clientes con pagos vencidos');
      return;
    }
    
    Alert.alert(
      'Enviar Recordatorios WhatsApp',
      `¿Enviar recordatorio por WhatsApp a ${vencidos.length} clientes vencidos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Enviar', 
          onPress: () => handleSendReminders(vencidos)
        }
      ]
    );
  };

  const handleSendReminders = async (vencidos) => {
    try {
      // Mostrar loading
      Alert.alert('Enviando...', 'Enviando recordatorios por WhatsApp');
      
      // TODO: Implementar funcionalidad de WhatsApp con SQLite
      // Por ahora simulamos el envío
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert('Recordatorios Enviados', `✅ Recordatorios enviados a ${vencidos.length} clientes`);
      
      // Recargar datos para actualizar la vista
      loadData();
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
          onPress={() => navigation.navigate('Clientes', { status: '' })}
        />
        <StatCard
          title="Al Día"
          value={stats?.clientesPagados || 0}
          icon="✅"
          color="#10B981"
          onPress={() => navigation.navigate('Clientes', { status: 'pagado' })}
        />
        <StatCard
          title="Vencidos"
          value={stats?.clientesVencidos || 0}
          icon="⚠️"
          color="#EF4444"
          onPress={() => navigation.navigate('Clientes', { status: 'vencido' })}
        />
        <StatCard
          title="Pendientes"
          value={stats?.clientesPendientes || 0}
          icon="🕒"
          color="#F59E0B"
          onPress={() => navigation.navigate('Clientes', { status: 'pendiente' })}
        />
      </View>

      {/* Ingresos Card */}
      <View style={styles.revenueCard}>
        <Text style={styles.revenueIcon}>💰</Text>
        <View style={styles.revenueInfo}>
          <Text style={styles.revenueTitle}>Ingresos del Mes</Text>
          <Text style={styles.revenueValue}>
            ${(stats?.ingresosMes || 0).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Send Reminders Button */}
      {stats?.clientesVencidos > 0 && (
        <TouchableOpacity style={styles.reminderButton} onPress={sendReminders}>
          <Text style={styles.reminderButtonText}>
            📢 Enviar Recordatorios ({stats?.clientesVencidos})
          </Text>
        </TouchableOpacity>
      )}

      {/* Últimos Pagos */}
      {paidClients.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>
                ✅ Últimos Pagos
              </Text>
              <View style={styles.clientCountBadge}>
                <Text style={styles.clientCountText}>{paidClients.length}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => setShowPaidDetails(!showPaidDetails)}
            >
              <Text style={styles.seeAllText}>
                {showPaidDetails ? 'Ocultar detalles' : 'Ver todos'}
              </Text>
              <Text style={[styles.seeAllArrow, { transform: [{ rotate: showPaidDetails ? '90deg' : '0deg' }] }]}>
                {showPaidDetails ? '↑' : '→'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Detalles expandibles de pagos */}
          {showPaidDetails && (
            <View style={styles.expandedDetails}>
              {paidClients.slice(0, 10).map((client) => (
                <TouchableOpacity
                  key={client.id || client._id}
                  style={styles.clientCard}
                  onPress={() => navigation.navigate('ClientDetail', { clientId: client.id || client._id })}
                >
                  <View style={styles.clientCompactInfo}>
                    {/* Primera línea: Nombre y Monto */}
                    <View style={styles.firstRow}>
                      <Text style={styles.clientName}>
                        {client.nombre} {client.apellido}
                      </Text>
                      <Text style={styles.amountText}>${client.montoMensual}</Text>
                    </View>
                    
                    {/* Segunda línea: Fecha y Estado */}
                    <View style={styles.secondRow}>
                      <Text style={styles.dateText}>
                        {client.updatedAt 
                          ? new Date(client.updatedAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })
                          : 'Sin fecha'
                        }
                      </Text>
                      <Text style={styles.paidText}>✅ Pagado</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              
              {/* Botón para ver todos en la pantalla de clientes */}
              {paidClients.length > 10 && (
                <TouchableOpacity 
                  style={styles.viewAllClientsButton}
                  onPress={() => navigation.navigate('Clientes', { status: 'pagado' })}
                >
                  <Text style={styles.viewAllClientsText}>
                    Ver todos los {paidClients.length} clientes pagados →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
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
      activeOpacity={0.8}
    >
      <View style={styles.statCardContent}>
        <Text style={styles.statIcon}>{icon}</Text>
        <View style={styles.statInfo}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
        {onPress && <Text style={styles.statArrow}>→</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ⏳ Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },

  //  Grid de estadísticas
  statsGrid: {
    flexDirection: 'column',
    padding: 20,
    gap: 16,
    paddingTop: 40,
  },
  statCard: {
    width: '100%',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  statIcon: {
    fontSize: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    marginRight: 16,
  },
  statInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  statTitle: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.95,
    fontWeight: '700',
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statArrow: {
    fontSize: 24,
    color: '#fff',
    opacity: 0.9,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // 💰 Tarjeta de ingresos
  revenueCard: {
    backgroundColor: '#8B5CF6',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  revenueIcon: {
    fontSize: 56,
    marginRight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  revenueInfo: {
    flex: 1,
  },
  revenueTitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 6,
    fontWeight: '500',
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // 🔔 Botón de recordatorios
  reminderButton: {
    backgroundColor: '#F97316',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  reminderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // 📋 Sección de vencidos
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'column',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 12,
    textAlign: 'center',
  },
  clientCountBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  clientCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minWidth: '100%',
  },
  seeAllText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 6,
  },
  seeAllArrow: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: 'bold',
    transition: 'transform 0.3s ease',
  },
  expandedDetails: {
    marginTop: 8,
  },
  viewAllClientsButton: {
    backgroundColor: '#F3F4F6',
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
  },
  viewAllClientsText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },

  // 👤 Tarjetas de clientes
  clientCard: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderLeftWidth: 4,
    borderLeftColor: '#16A34A',
    shadowColor: '#16A34A',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  clientCompactInfo: {
    flex: 1,
  },
  firstRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  secondRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  paidText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    textAlign: 'center',
  },
});
