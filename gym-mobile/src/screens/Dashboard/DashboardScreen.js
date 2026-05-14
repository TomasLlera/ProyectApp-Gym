// src/screens/Dashboard/DashboardScreen.js

import React, { useState, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../../context/DatabaseContext';
import { theme } from '../../constants/theme';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function getFormattedDate() {
  const s = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getProgressColor(pct) {
  if (pct >= 0.75) return '#10B981';
  if (pct >= 0.5) return '#F97316';
  return '#EF4444';
}

export default function DashboardScreen({ navigation }) {
  const { clients } = useDatabase();
  const [stats, setStats] = useState(null);
  const [paidClients, setPaidClients] = useState([]);
  const [vencidosClients, setVencidosClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaidDetails, setShowPaidDetails] = useState(false);
  const [hideIngresos, setHideIngresos] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      fadeAnim.setValue(0);
      progressAnim.setValue(0);
      loadData();
    }, [])
  );

  const animateIn = (pct) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 500, useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: pct, duration: 900, delay: 400, useNativeDriver: false,
      }),
    ]).start();
  };

  const loadData = async () => {
    try {
      if (!clients?.getAll) throw new Error('Servicio no disponible');

      const allClients = await clients.getAll();
      if (!Array.isArray(allClients)) throw new Error('Datos inválidos');

      const valid = allClients.filter(c =>
        c.nombre && c.apellido &&
        c.montoMensual != null && !isNaN(c.montoMensual)
      );

      const validStates = ['pagado', 'vencido', 'pendiente'];
      valid.forEach(c => { if (!validStates.includes(c.estadoPago)) c.estadoPago = 'pendiente'; });

      const pagados  = valid.filter(c => c.estadoPago === 'pagado');
      const vencidos = valid.filter(c => c.estadoPago === 'vencido');

      const ingresosMes = pagados.reduce((sum, c) => sum + (parseFloat(c.montoMensual) || 0), 0);

      setStats({
        totalClientes:     valid.length,
        clientesPagados:   pagados.length,
        clientesVencidos:  vencidos.length,
        clientesPendientes: valid.filter(c => c.estadoPago === 'pendiente').length,
        ingresosMes:       Math.round(ingresosMes),
      });

      const byDate = arr => [...arr].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      setPaidClients(byDate(pagados).slice(0, 10));
      setVencidosClients(byDate(vencidos));

      const pct = valid.length > 0 ? pagados.length / valid.length : 0;
      animateIn(pct);

    } catch (err) {
      console.error('Error cargando dashboard:', err);
      setStats({ totalClientes: 0, clientesPagados: 0, clientesVencidos: 0, clientesPendientes: 0, ingresosMes: 0 });
      setPaidClients([]);
      setVencidosClients([]);
      animateIn(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const sendWhatsApp = (client) => {
    if (!client.telefono) {
      Alert.alert('Sin teléfono', `${client.nombre} no tiene teléfono registrado`);
      return;
    }
    let phone = client.telefono.replace(/[^0-9+]/g, '');
    if (!phone.startsWith('+54')) phone = '+54' + phone.replace(/^0/, '');
    const num = phone.replace('+', '');
    const msg = `Hola ${client.nombre}! Te recordamos que tu cuota en O2 Gym está vencida. Por favor acercate a regularizar. ¡Gracias!`;
    Linking.openURL(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="barbell-outline" size={52} color="#F97316" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  const pct = stats?.totalClientes > 0 ? stats.clientesPagados / stats.totalClientes : 0;
  const progressColor = getProgressColor(pct);

  return (
    <LinearGradient colors={['#0F0F0F', '#1A1A1A', '#0F0F0F']} style={styles.gradientContainer}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F97316" />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── GREETING ── */}
          <View style={styles.greeting}>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.greetingDate}>{getFormattedDate()}</Text>
          </View>

          {/* ── INGRESOS CARD ── */}
          <View style={styles.revenueCardWrapper}>
            <LinearGradient
              colors={['#F97316', '#EA580C', '#B45309']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.revenueCard}
            >
              <View style={styles.revenueLeft}>
                <View style={styles.revenueLabelRow}>
                  <Text style={styles.revenueLabel}>Ingresos del mes</Text>
                  <TouchableOpacity
                    onPress={() => setHideIngresos(v => !v)}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={hideIngresos ? 'eye-off-outline' : 'eye-outline'}
                      size={16}
                      color="rgba(255,255,255,0.8)"
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.revenueValue}>
                  {hideIngresos ? '$ ••••••' : `$${(stats?.ingresosMes || 0).toLocaleString()}`}
                </Text>
                <Text style={styles.revenueSubtitle}>
                  {stats?.clientesPagados || 0} pagos registrados
                </Text>
              </View>
              <View style={styles.revenueRight}>
                <Ionicons name="cash-outline" size={56} color="rgba(255,255,255,0.2)" />
                <TouchableOpacity
                  style={styles.revenueLink}
                  onPress={() => navigation.navigate('Statistics')}
                >
                  <Ionicons name="bar-chart-outline" size={13} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.revenueLinkText}>Ver estadísticas</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* ── STATS GRID ── */}
          <View style={styles.statsGrid}>
            <StatCard title="Total"     value={stats?.totalClientes || 0}     icon="people"           color="#3B82F6" onPress={() => navigation.navigate('Clientes')} />
            <StatCard title="Al Día"    value={stats?.clientesPagados || 0}   icon="checkmark-circle" color="#10B981" onPress={() => navigation.navigate('Clientes', { status: 'pagado' })} />
            <StatCard title="Vencidos"  value={stats?.clientesVencidos || 0}  icon="alert-circle"     color="#EF4444" onPress={() => navigation.navigate('Clientes', { status: 'vencido' })} />
            <StatCard title="Pendientes" value={stats?.clientesPendientes || 0} icon="time"           color="#F59E0B" onPress={() => navigation.navigate('Clientes', { status: 'pendiente' })} />
          </View>

          {/* ── PROGRESS BAR ── */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Cobros del mes</Text>
              <Text style={[styles.progressPct, { color: progressColor }]}>
                {stats?.clientesPagados || 0}/{stats?.totalClientes || 0}
                {'  '}{Math.round(pct * 100)}%
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: progressColor,
                    width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  },
                ]}
              />
            </View>
            <View style={styles.progressLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendText}>Bajo</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#F97316' }]} />
                <Text style={styles.legendText}>Medio</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>Bien</Text>
              </View>
            </View>
          </View>

          {/* ── QUICK ACTIONS ── */}
          <View style={styles.quickSection}>
            <Text style={styles.quickSectionLabel}>Acciones rápidas</Text>
            <View style={styles.quickRow}>
              <QuickBtn icon="person-add-outline" label="Nuevo Cliente"  color="#3B82F6" onPress={() => navigation.navigate('Clientes')} />
              <QuickBtn icon="barbell-outline"    label="Nueva Rutina"   color="#8B5CF6" onPress={() => navigation.navigate('Rutinas')} />
              <QuickBtn icon="library-outline"    label="Ejercicios"     color="#10B981" onPress={() => navigation.navigate('Rutinas', { screen: 'BibliotecaEjercicios' })} />
              <QuickBtn icon="stats-chart"        label="Estadísticas"   color="#F59E0B" onPress={() => navigation.navigate('Statistics')} />
            </View>
          </View>

          {/* ── VENCIDOS ALERT ── */}
          {vencidosClients.length > 0 && (
            <View style={styles.alertSection}>
              <View style={styles.alertHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="warning" size={17} color="#EF4444" />
                  <Text style={styles.alertTitle}>Pagos vencidos</Text>
                  <View style={styles.alertBadge}>
                    <Text style={styles.alertBadgeText}>{vencidosClients.length}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.alertWaBtn}
                  onPress={() => {
                    const withPhone = vencidosClients.filter(c => c.telefono);
                    if (withPhone.length === 0) {
                      Alert.alert('Sin teléfonos', 'Ningún cliente vencido tiene teléfono');
                      return;
                    }
                    sendWhatsApp(withPhone[0]);
                  }}
                >
                  <Ionicons name="logo-whatsapp" size={13} color="#25D366" />
                  <Text style={styles.alertWaText}>Avisar</Text>
                </TouchableOpacity>
              </View>

              {vencidosClients.slice(0, 5).map((client) => (
                <View key={client.id} style={styles.vencidoRow}>
                  <TouchableOpacity
                    style={styles.vencidoMain}
                    onPress={() => navigation.navigate('ClientDetail', { clientId: client.id })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.vencidoAvatar}>
                      <Text style={styles.vencidoAvatarText}>
                        {client.nombre.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.vencidoInfo}>
                      <Text style={styles.vencidoName}>{client.nombre} {client.apellido}</Text>
                      <Text style={styles.vencidoAmount}>${client.montoMensual}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.vencidoWa} onPress={() => sendWhatsApp(client)}>
                    <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                  </TouchableOpacity>
                </View>
              ))}

              {vencidosClients.length > 5 && (
                <TouchableOpacity
                  style={styles.alertViewAll}
                  onPress={() => navigation.navigate('Clientes', { status: 'vencido' })}
                >
                  <Text style={styles.alertViewAllText}>
                    Ver {vencidosClients.length - 5} más vencidos →
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── ÚLTIMOS PAGOS ── */}
          {paidClients.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={17} color="#10B981" />
                  <Text style={styles.sectionTitle}>Últimos pagos</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{paidClients.length}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.toggleBtn}
                  onPress={() => setShowPaidDetails(v => !v)}
                >
                  <Text style={styles.toggleBtnText}>
                    {showPaidDetails ? 'Ocultar' : 'Ver todos'}
                  </Text>
                  <Ionicons
                    name={showPaidDetails ? 'chevron-up' : 'chevron-down'}
                    size={13} color="#fff"
                  />
                </TouchableOpacity>
              </View>

              {showPaidDetails && (
                <View style={styles.expandedList}>
                  {paidClients.map((client) => (
                    <TouchableOpacity
                      key={client.id}
                      style={styles.clientCard}
                      onPress={() => navigation.navigate('ClientDetail', { clientId: client.id })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.clientRow1}>
                        <Text style={styles.clientName}>{client.nombre} {client.apellido}</Text>
                        <Text style={styles.clientAmount}>${client.montoMensual}</Text>
                      </View>
                      <View style={styles.clientRow2}>
                        <Text style={styles.clientDate}>
                          {client.updatedAt
                            ? new Date(client.updatedAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
                            : 'Sin fecha'
                          }
                        </Text>
                        <Text style={styles.paidBadge}>Pagado</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {paidClients.length >= 10 && (
                    <TouchableOpacity
                      style={styles.viewAllBtn}
                      onPress={() => navigation.navigate('Clientes', { status: 'pagado' })}
                    >
                      <Text style={styles.viewAllBtnText}>Ver todos los pagados →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          <View style={{ height: 24 }} />
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ title, value, icon, color, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { borderColor: color + '55' }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

function QuickBtn({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity style={styles.quickBtn} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickBtnCircle, { backgroundColor: color, shadowColor: color }]}>
        <Ionicons name={icon} size={22} color="#fff" />
      </View>
      <Text style={styles.quickBtnLabel} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradientContainer: { flex: 1 },
  container: { flex: 1 },

  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#0F0F0F', gap: 14,
  },
  loadingText: { fontSize: 16, color: '#A1A1AA', fontWeight: '600' },

  // ── GREETING
  greeting: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
  },
  greetingText: { fontSize: 22, fontWeight: '800', color: '#F5F5F5' },
  greetingDate: { fontSize: 13, color: '#71717A', marginTop: 2, textTransform: 'capitalize' },

  // ── REVENUE CARD
  revenueCardWrapper: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 18,
    shadowColor: '#F97316', shadowOpacity: 0.45,
    shadowRadius: 14, shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  revenueCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 22, borderRadius: 18,
  },
  revenueLeft: { flex: 1 },
  revenueLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  revenueLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  eyeBtn: { padding: 2 },
  revenueValue: { fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 4 },
  revenueSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  revenueRight: { alignItems: 'center', gap: 10 },
  revenueLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  revenueLinkText: { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  // ── STATS GRID
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16, gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 6,
    alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#2C2C2E',
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statTitle: {
    fontSize: 10, color: '#71717A',
    fontWeight: '600', textTransform: 'uppercase',
    textAlign: 'center', letterSpacing: 0.2,
  },

  // ── PROGRESS BAR
  progressSection: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16, marginBottom: 12,
    padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: '#2C2C2E',
  },
  progressHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  progressTitle: { fontSize: 14, fontWeight: '700', color: '#F5F5F5' },
  progressPct: { fontSize: 13, fontWeight: '700' },
  progressTrack: {
    height: 10, backgroundColor: '#2C2C2E',
    borderRadius: 5, overflow: 'hidden', marginBottom: 10,
  },
  progressFill: { height: '100%', borderRadius: 5 },
  progressLegend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#71717A' },

  // ── QUICK ACTIONS
  quickSection: { marginHorizontal: 16, marginBottom: 12 },
  quickSectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#71717A',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14,
  },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickBtn: { flex: 1, alignItems: 'center', gap: 8 },
  quickBtnCircle: {
    width: 54, height: 54, borderRadius: 27,
    justifyContent: 'center', alignItems: 'center',
    shadowOpacity: 0.4, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  quickBtnLabel: {
    fontSize: 11, color: '#A1A1AA', fontWeight: '600',
    textAlign: 'center', lineHeight: 15,
  },

  // ── VENCIDOS ALERT
  alertSection: {
    backgroundColor: '#1A0A0A',
    marginHorizontal: 16, marginBottom: 12,
    padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#7F1D1D',
    borderLeftWidth: 3, borderLeftColor: '#EF4444',
  },
  alertHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
    paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#7F1D1D',
  },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#F5F5F5' },
  alertBadge: {
    backgroundColor: '#EF4444', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  alertBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  alertWaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#0D2818', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#25D366',
  },
  alertWaText: { fontSize: 11, color: '#25D366', fontWeight: '600' },
  vencidoRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 6,
  },
  vencidoMain: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#2A0F0F', borderRadius: 10,
    padding: 10, marginRight: 8,
    borderWidth: 1, borderColor: '#7F1D1D',
  },
  vencidoAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EF4444',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  vencidoAvatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  vencidoInfo: { flex: 1 },
  vencidoName: { fontSize: 13, fontWeight: '600', color: '#F5F5F5' },
  vencidoAmount: { fontSize: 12, color: '#EF4444', fontWeight: '600', marginTop: 1 },
  vencidoWa: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#0D2818',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#25D366',
  },
  alertViewAll: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
  alertViewAllText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },

  // ── ÚLTIMOS PAGOS
  section: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16, marginBottom: 8,
    padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: '#2C2C2E',
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#2C2C2E',
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#F5F5F5' },
  countBadge: {
    backgroundColor: '#431407', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: '#F97316',
  },
  countBadgeText: { fontSize: 11, fontWeight: '700', color: '#EA6C0A' },
  toggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F97316', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#EA6C0A',
  },
  toggleBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  expandedList: { marginTop: 4 },
  clientCard: {
    backgroundColor: '#0F0F0F', padding: 12,
    borderRadius: 12, marginBottom: 6,
    borderLeftWidth: 3, borderLeftColor: '#F97316',
  },
  clientRow1: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  clientRow2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientName: { fontSize: 14, fontWeight: '700', color: '#F5F5F5', flex: 1, marginRight: 8 },
  clientAmount: { fontSize: 15, fontWeight: '800', color: '#16A34A' },
  clientDate: { fontSize: 12, color: '#A1A1AA', flex: 1 },
  paidBadge: {
    fontSize: 11, color: '#EA6C0A', fontWeight: '700',
    backgroundColor: '#431407', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: '#F97316',
  },
  viewAllBtn: {
    alignItems: 'center', paddingVertical: 10, marginTop: 4,
    borderRadius: 10, borderWidth: 1, borderColor: '#F97316',
    borderStyle: 'dashed',
  },
  viewAllBtnText: { color: '#EA6C0A', fontSize: 13, fontWeight: '600' },
});
