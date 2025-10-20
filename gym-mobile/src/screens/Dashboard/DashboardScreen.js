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
      {/* Ingresos Card - Movido al principio */}
      <TouchableOpacity 
        style={styles.revenueCardTop}
        onPress={() => navigation.navigate('Statistics')}
        activeOpacity={0.8}
      >
        <Text style={styles.revenueIcon}>💰</Text>
        <View style={styles.revenueInfo}>
          <Text style={styles.revenueTitle}>Ingresos del Mes</Text>
          <Text style={styles.revenueValue}>
            ${(stats?.ingresosMes || 0).toLocaleString()}
          </Text>
        </View>
        <Text style={styles.revenueArrow}>→</Text>
      </TouchableOpacity>

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

      {/* Send Reminders Button */}
      {stats?.clientesVencidos > 0 && (
        <TouchableOpacity style={styles.reminderButton} onPress={sendReminders}>
          <View style={styles.reminderButtonContent}>
            <Text style={styles.reminderButtonText}>
              📢 Enviar Recordatorios
            </Text>
            <View style={styles.reminderCountBadge}>
              <Text style={styles.reminderCountText}>{stats?.clientesVencidos}</Text>
            </View>
          </View>
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
        <View style={styles.statIconRow}>
          <Text style={styles.statIcon}>{icon}</Text>
          <Text style={styles.statValue}>{value}</Text>
        </View>
        <Text style={styles.statTitle}>{title}</Text>
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

  // 📊 Grid de estadísticas (Diseño cuadrado compacto)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingVertical: 0,
    gap: 6,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    aspectRatio: 1.3,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ scale: 1 }],
  },
  statCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginRight: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  statTitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.95,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
  },

  // 💰 Tarjeta de ingresos (en la parte superior)
  revenueCardTop: {
    backgroundColor: '#8B5CF6',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ scale: 1 }],
  },
  // 💰 Tarjeta de ingresos (versión anterior)
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
    fontSize: 40,
    marginRight: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  revenueInfo: {
    flex: 1,
  },
  revenueTitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
    fontWeight: '500',
  },
  revenueValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  revenueArrow: {
    fontSize: 20,
    color: '#fff',
    opacity: 0.9,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginLeft: 10,
  },

  // 🔔 Botón de recordatorios
  reminderButton: {
    backgroundColor: '#F97316',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ scale: 1 }],
  },
  reminderButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginRight: 10,
  },
  reminderCountBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#FDE68A',
    shadowColor: '#D97706',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  reminderCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D97706',
  },

  // 📋 Sección de vencidos
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    borderWidth: 2,
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
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#BBF7D0',
    shadowColor: '#16A34A',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
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
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#C7D2FE',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    minWidth: '100%',
    transform: [{ scale: 1 }],
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
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    transform: [{ scale: 1 }],
  },
  viewAllClientsText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },

  // 👤 Tarjetas de clientes
  clientCard: {
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#BBF7D0',
    borderLeftWidth: 5,
    borderLeftColor: '#16A34A',
    shadowColor: '#16A34A',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    transform: [{ scale: 1 }],
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
    fontWeight: '700',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    shadowColor: '#16A34A',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
