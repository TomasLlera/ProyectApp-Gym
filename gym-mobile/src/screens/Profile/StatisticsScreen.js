// src/screens/Profile/StatisticsScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDatabase } from '../../context/DatabaseContext';
import { useFocusEffect } from '@react-navigation/native';

export default function StatisticsScreen({ navigation }) {
  const { clients } = useDatabase();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [dailyIncome, setDailyIncome] = useState(0);
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadStatistics();
    }, [selectedDate])
  );

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const allClients = await clients.getAll();
      
      // Calcular estadísticas del mes actual
      const currentMonth = selectedDate.getMonth();
      const currentYear = selectedDate.getFullYear();
      
      const monthClients = allClients.filter(client => {
        const clientDate = new Date(client.updatedAt);
        return clientDate.getMonth() === currentMonth && 
               clientDate.getFullYear() === currentYear &&
               client.estadoPago === 'pagado';
      });

      const totalIngresos = monthClients.reduce((sum, client) => 
        sum + (client.montoMensual || 0), 0
      );

      // Calcular ingresos del día seleccionado
      const selectedDayIncome = allClients
        .filter(client => {
          const clientDate = new Date(client.updatedAt);
          return clientDate.toDateString() === selectedDate.toDateString() &&
                 client.estadoPago === 'pagado';
        })
        .reduce((sum, client) => sum + (client.montoMensual || 0), 0);

      // Generar datos del calendario (ingresos por día)
      const calendarIncomes = {};
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(currentYear, currentMonth, day);
        const dayIncome = allClients
          .filter(client => {
            const clientDate = new Date(client.updatedAt);
            return clientDate.toDateString() === dayDate.toDateString() &&
                   client.estadoPago === 'pagado';
          })
          .reduce((sum, client) => sum + (client.montoMensual || 0), 0);
        
        calendarIncomes[day] = dayIncome;
      }

      setMonthlyStats({
        totalClientes: monthClients.length,
        totalIngresos,
        promedioDiario: totalIngresos / daysInMonth,
        mejorDia: Math.max(...Object.values(calendarIncomes))
      });
      
      setDailyIncome(selectedDayIncome);
      setCalendarData(calendarIncomes);
      
    } catch (error) {
      console.error('Error loading statistics:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const renderCalendar = () => {
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const calendarCells = [];
    
    // Celdas vacías al inicio
    for (let i = 0; i < startingDay; i++) {
      calendarCells.push(<View key={`empty-${i}`} style={styles.calendarCell} />);
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const income = calendarData[day] || 0;
      const isSelected = day === selectedDate.getDate();
      const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();
      
      calendarCells.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarCell,
            styles.calendarDay,
            isSelected && styles.selectedDay,
            isToday && !isSelected && styles.todayDay,
            income > 0 && styles.incomeDay
          ]}
          onPress={() => setSelectedDate(new Date(currentYear, currentMonth, day))}
        >
          <Text style={[
            styles.dayText,
            isSelected && styles.selectedDayText,
            isToday && !isSelected && styles.todayDayText,
            income > 0 && !isSelected && styles.incomeDayText
          ]}>
            {day}
          </Text>
          {income > 0 && (
            <Text style={styles.incomeText}>${income}</Text>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.calendarContainer}>
        {/* Header del calendario */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setSelectedDate(new Date(currentYear, currentMonth - 1, 1))}
          >
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          
          <Text style={styles.monthTitle}>
            {monthNames[currentMonth]} {currentYear}
          </Text>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setSelectedDate(new Date(currentYear, currentMonth + 1, 1))}
          >
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Días de la semana */}
        <View style={styles.weekDaysRow}>
          {weekDays.map(day => (
            <View key={day} style={styles.weekDayCell}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Días del mes */}
        <View style={styles.calendarGrid}>
          {calendarCells}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📊 Estadísticas</Text>
      </View>

      {/* Estadísticas del mes */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💰</Text>
          <View style={styles.statInfo}>
            <Text style={styles.statValue}>${(monthlyStats?.totalIngresos || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Ingresos del Mes</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatValue}>{monthlyStats?.totalClientes || 0}</Text>
            <Text style={styles.miniStatLabel}>Pagos</Text>
          </View>
          
          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatValue}>${Math.round(monthlyStats?.promedioDiario || 0)}</Text>
            <Text style={styles.miniStatLabel}>Promedio Diario</Text>
          </View>
          
          <View style={styles.miniStatCard}>
            <Text style={styles.miniStatValue}>${monthlyStats?.mejorDia || 0}</Text>
            <Text style={styles.miniStatLabel}>Mejor Día</Text>
          </View>
        </View>
      </View>

      {/* Calendario */}
      <View style={styles.calendarSection}>
        <Text style={styles.sectionTitle}>Calendario de Ingresos</Text>
        {renderCalendar()}
      </View>

      {/* Detalle del día seleccionado */}
      <View style={styles.dayDetailSection}>
        <Text style={styles.sectionTitle}>
          {selectedDate.toLocaleDateString('es-ES', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          })}
        </Text>
        
        <View style={styles.dayDetailCard}>
          <View style={styles.dayDetailHeader}>
            <Text style={styles.dayDetailIcon}>💵</Text>
            <View>
              <Text style={styles.dayIncomeValue}>${dailyIncome.toLocaleString()}</Text>
              <Text style={styles.dayIncomeLabel}>Ingresos del día</Text>
            </View>
          </View>
          
          {dailyIncome === 0 ? (
            <Text style={styles.noIncomeText}>No hay ingresos registrados para este día</Text>
          ) : (
            <Text style={styles.incomeDescription}>
              Se registraron ingresos por pagos de clientes
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
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
  
  // Header
  header: {
    backgroundColor: '#1A1A1A',  // Negro O2
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 3,
    borderBottomColor: '#FF6B35',  // Naranja O2
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#FF6B35',  // Naranja O2
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },

  // Estadísticas
  statsContainer: {
    padding: 20,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF6B35',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#FFE5DC',
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',  // Naranja O2
  },
  statIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',  // Naranja O2
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FFE5DC',
    borderTopWidth: 3,
    borderTopColor: '#FF6B35',
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',  // Naranja O2
    marginBottom: 4,
  },
  miniStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Calendario
  calendarSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',  // Negro O2
    marginBottom: 16,
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#FF6B35',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#FFE5DC',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD4C4',
  },
  navButtonText: {
    fontSize: 24,
    color: '#FF6B35',  // Naranja O2
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',  // Negro O2
  },
  
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDay: {
    margin: 1,
    borderRadius: 8,
  },
  selectedDay: {
    backgroundColor: '#FF6B35',  // Naranja O2
  },
  todayDay: {
    backgroundColor: '#FFE5DC',  // Naranja muy claro
  },
  incomeDay: {
    backgroundColor: '#FFF5F2',  // Naranja muy suave
    borderWidth: 1,
    borderColor: '#FFD4C4',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',  // Negro O2
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  todayDayText: {
    color: '#FF6B35',  // Naranja O2
  },
  incomeDayText: {
    color: '#E55A2B',  // Naranja oscuro
  },
  incomeText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#E55A2B',  // Naranja oscuro
    marginTop: 1,
  },

  // Detalle del día
  dayDetailSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  dayDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#FF6B35',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#FFE5DC',
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  dayDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayDetailIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  dayIncomeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',  // Naranja O2
    marginBottom: 2,
  },
  dayIncomeLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  noIncomeText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  incomeDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
});