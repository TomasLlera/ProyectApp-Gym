// src/screens/Clients/ClientsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { clientsAPI } from '../../api/axios';

export default function ClientsScreen({ navigation, route }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(route.params?.status || '');

  useEffect(() => {
    loadClients();
  }, [statusFilter]);

  const loadClients = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      
      const { data } = await clientsAPI.getAll(params);
      setClients(data.data.clients);
    } catch (error) {
      console.error('Error:', error);
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
      'Confirmar Pago',
      '¿Marcar como pagado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await clientsAPI.updatePayment(clientId, 'pagado');
              Alert.alert('Éxito', 'Cliente marcado como pagado');
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
      pagado: { label: '✅ Al día', color: '#10B981' },
      vencido: { label: '⚠️ Vencido', color: '#EF4444' },
      pendiente: { label: '⏳ Pendiente', color: '#F59E0B' },
    };
    return config[status] || config.pendiente;
  };

  const renderClient = ({ item }) => {
    const badge = getStatusBadge(item.estadoPago);
    
    return (
      <TouchableOpacity
        style={styles.clientCard}
        onPress={() => navigation.navigate('ClientDetail', { clientId: item._id })}
      >
        <View style={styles.clientHeader}>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>
              {item.nombre} {item.apellido}
            </Text>
            <Text style={styles.clientEmail}>{item.email}</Text>
            <Text style={styles.clientDoc}>DNI: {item.documento}</Text>
          </View>
          
          <View style={styles.clientStatus}>
            <View style={[styles.statusBadge, { backgroundColor: badge.color }]}>
              <Text style={styles.statusText}>{badge.label}</Text>
            </View>
            <Text style={styles.amountText}>${item.montoMensual}</Text>
          </View>
        </View>

        {item.estadoPago !== 'pagado' && (
          <TouchableOpacity
            style={styles.payButton}
            onPress={(e) => {
              e.stopPropagation();
              markAsPaid(item._id);
            }}
          >
            <Text style={styles.payButtonText}>💰 Marcar como Pagado</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cliente..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, statusFilter === '' && styles.filterButtonActive]}
          onPress={() => setStatusFilter('')}
        >
          <Text style={[styles.filterText, statusFilter === '' && styles.filterTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, statusFilter === 'pagado' && styles.filterButtonActive]}
          onPress={() => setStatusFilter('pagado')}
        >
          <Text style={[styles.filterText, statusFilter === 'pagado' && styles.filterTextActive]}>
            Al día
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, statusFilter === 'vencido' && styles.filterButtonActive]}
          onPress={() => setStatusFilter('vencido')}
        >
          <Text style={[styles.filterText, statusFilter === 'vencido' && styles.filterTextActive]}>
            Vencidos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Client List */}
      <FlatList
        data={clients}
        renderItem={renderClient}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏋️</Text>
            <Text style={styles.emptyText}>No hay clientes</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  clientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  clientDoc: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  clientStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  amountText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  payButton: {
    backgroundColor: '#10B981',
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
  },
});