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
import { LinearGradient } from 'expo-linear-gradient';
import { useDatabase } from '../../context/DatabaseContext';
import { theme } from '../../constants/theme';

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
      // ========================================
      // VALIDACIÓN 1: Verificar que clients esté disponible
      // ========================================
      if (!clients || !clients.getAll) {
        throw new Error('Servicio de clientes no disponible');
      }

      const allClients = await clients.getAll();
      
      // ========================================
      // VALIDACIÓN 2: Verificar que sea un array válido
      // ========================================
      if (!Array.isArray(allClients)) {
        throw new Error('Datos de clientes inválidos');
        return;
      }

      console.log(`📊 Cargando estadísticas para ${allClients.length} clientes`);

      // ========================================
      // VALIDACIÓN 3: Filtrar clientes con datos incompletos o inválidos
      // ========================================
      const validClients = allClients.filter(c => {
        // Verificar campos obligatorios
        if (!c.nombre || !c.apellido) {
          console.warn(`⚠️ Cliente sin nombre completo:`, c.id);
          return false;
        }
        
        // Verificar que montoMensual sea un número válido
        if (c.montoMensual === null || c.montoMensual === undefined || isNaN(c.montoMensual)) {
          console.warn(`⚠️ Cliente ${c.nombre} sin monto válido`);
          return false;
        }

        return true;
      });

      console.log(`✅ ${validClients.length} clientes válidos de ${allClients.length} totales`);

      // ========================================
      // VALIDACIÓN 4: Verificar y corregir estadoPago inválido
      // ========================================
      const validStates = ['pagado', 'vencido', 'pendiente'];
      validClients.forEach(c => {
        if (!validStates.includes(c.estadoPago)) {
          console.warn(`⚠️ Cliente ${c.nombre} con estado inválido: ${c.estadoPago}`);
          c.estadoPago = 'pendiente'; // Valor por defecto
        }
      });

      // ========================================
      // CALCULAR ESTADÍSTICAS CON DATOS VALIDADOS
      // ========================================
      const clientesPagados = validClients.filter(c => c.estadoPago === 'pagado').length;
      const clientesVencidos = validClients.filter(c => c.estadoPago === 'vencido').length;
      const clientesPendientes = validClients.filter(c => c.estadoPago === 'pendiente').length;

      // Calcular ingresos solo de clientes pagados con monto válido
      const ingresosMes = validClients
        .filter(c => c.estadoPago === 'pagado')
        .reduce((sum, c) => {
          const monto = parseFloat(c.montoMensual) || 0;
          return sum + monto;
        }, 0);

      // ========================================
      // VALIDACIÓN 5: Verificar que los números sean válidos
      // ========================================
      if (isNaN(ingresosMes)) {
        console.error('❌ Error calculando ingresos');
        throw new Error('Error en cálculo de ingresos');
      }

      setStats({
        totalClientes: validClients.length,
        clientesPagados,
        clientesVencidos,
        clientesPendientes,
        ingresosMes: Math.round(ingresosMes) // Redondear para evitar decimales extraños
      });

      // ========================================
      // OBTENER CLIENTES PAGADOS PARA LA LISTA
      // ========================================
      const clientesPagadosRecientes = validClients
        .filter(c => c.estadoPago === 'pagado')
        .sort((a, b) => {
          // Ordenar por fecha de actualización (más reciente primero)
          const dateA = new Date(a.updatedAt || a.fechaUltimoPago || 0);
          const dateB = new Date(b.updatedAt || b.fechaUltimoPago || 0);
          return dateB - dateA;
        })
        .slice(0, 10); // Solo los últimos 10

      setPaidClients(clientesPagadosRecientes);

      console.log('✅ Dashboard cargado exitosamente');

    } catch (error) {
      console.error('❌ Error cargando datos del dashboard:', error);
      
      // Mostrar error al usuario
      Alert.alert(
        'Error',
        'No se pudieron cargar los datos del dashboard. Por favor, intenta nuevamente.',
        [
          { text: 'Reintentar', onPress: () => loadData() },
          { text: 'Cancelar', style: 'cancel' }
        ]
      );

      // Establecer valores por defecto para evitar crashes
      setStats({
        totalClientes: 0,
        clientesPagados: 0,
        clientesVencidos: 0,
        clientesPendientes: 0,
        ingresosMes: 0
      });
      setPaidClients([]);
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
    <LinearGradient
      colors={['#1A1A1A', '#2A2A2A', '#1A1A1A']}
      style={styles.gradientContainer}
    >
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
    </LinearGradient>
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
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },

  // ⏳ Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
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
    shadowColor: theme.colors.primary,
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
    backgroundColor: theme.colors.primary, // Naranja O2
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
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
    backgroundColor: theme.colors.primary,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
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
    margin: 16, 
    marginTop: 0, 
    padding: 16, 
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFE5DC',  // Borde naranja suave
  },
  sectionHeader: {
    flexDirection: 'column',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B35',  // Naranja O2
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
    color: '#1A1A1A',  // Negro O2
    marginRight: 12,
    textAlign: 'center',
  },
  clientCountBadge: {
    backgroundColor: '#FFE5DC',  // Naranja muy claro
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#FF6B35',  // Naranja O2
    shadowColor: '#FF6B35',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  clientCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E55A2B',  // Naranja oscuro
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',  // Naranja O2
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E55A2B',  // Naranja oscuro
    shadowColor: '#FF6B35',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    minWidth: '100%',
    transform: [{ scale: 1 }],
  },
  seeAllText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 6,
  },
  seeAllArrow: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    transition: 'transform 0.3s ease',
  },
  expandedDetails: {
    marginTop: 8,
  },
  viewAllClientsButton: {
    backgroundColor: '#FFF5F2',  // Naranja muy suave
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',  // Naranja O2
    borderStyle: 'solid',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    transform: [{ scale: 1 }],
  },
  viewAllClientsText: {
    color: '#E55A2B',  // Naranja oscuro
    fontSize: 14,
    fontWeight: '700',
  },

  // 👤 Tarjetas de clientes
  clientCard: {
    backgroundColor: '#FFF5F2',  // Fondo naranja muy suave
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FFD4C4',  // Borde naranja claro
    borderLeftWidth: 5,
    borderLeftColor: '#FF6B35',  // Borde izquierdo naranja O2
    shadowColor: '#FF6B35',
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
    color: theme.colors.text.primary,
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
    color: theme.colors.text.secondary,
    fontWeight: '500',
    flex: 1,
  },
  paidText: {
    fontSize: 11,
    color: '#E55A2B',  // Naranja oscuro
    fontWeight: '700',
    backgroundColor: '#FFE5DC',  // Fondo naranja claro
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#FF6B35',  // Borde naranja O2
    shadowColor: '#FF6B35',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
