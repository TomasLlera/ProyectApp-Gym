// src/screens/Routines/RoutineTemplatesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { routinesAPI, clientsAPI } from '../../api/axios';

export default function RoutineTemplatesScreen({ navigation }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data } = await routinesAPI.getTemplates();
      setTemplates(data.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las plantillas');
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = async (template) => {
    setSelectedTemplate(template);
    try {
      const { data } = await clientsAPI.getAll({ limit: 100 });
      setClients(data.data.clients);
      setShowClientModal(true);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los clientes');
    }
  };

  const assignTemplate = async (clientId) => {
    try {
      await routinesAPI.create({
        clienteId,
        ...selectedTemplate,
      });
      
      Alert.alert('Éxito', 'Rutina creada', [
        { text: 'OK', onPress: () => {
          setShowClientModal(false);
          navigation.goBack();
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la rutina');
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📚 Plantillas</Text>
        <Text style={styles.headerSubtitle}>Selecciona una plantilla</Text>
      </View>

      <ScrollView style={styles.list}>
        {templates.map((template, index) => (
          <View key={index} style={styles.templateCard}>
            <Text style={styles.templateName}>{template.nombre}</Text>
            
            <View style={styles.templateBadges}>
              <View style={[styles.badge, { backgroundColor: getTipoColor(template.tipo) }]}>
                <Text style={styles.badgeText}>{template.tipo}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{template.nivel}</Text>
              </View>
            </View>

            <View style={styles.templateInfo}>
              <Text style={styles.infoText}>💪 {template.ejercicios?.length} ejercicios</Text>
              <Text style={styles.infoText}>⏱️ {template.duracionEstimada} min</Text>
              <Text style={styles.infoText}>📅 {template.diasSemana?.length} días</Text>
            </View>

            <View style={styles.daysContainer}>
              {template.diasSemana?.map((dia) => (
                <View key={dia} style={styles.dayChip}>
                  <Text style={styles.dayChipText}>{dia.slice(0, 3).toUpperCase()}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.useButton}
              onPress={() => selectTemplate(template)}
            >
              <Text style={styles.useButtonText}>✨ Usar Plantilla</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Client Selection Modal */}
      <Modal
        visible={showClientModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowClientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Cliente</Text>
              <TouchableOpacity onPress={() => setShowClientModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={clients}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.clientItem}
                  onPress={() => assignTemplate(item._id)}
                >
                  <Text style={styles.clientName}>
                    {item.nombre} {item.apellido}
                  </Text>
                  <Text style={styles.clientEmail}>{item.email}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No hay clientes</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getTipoColor(tipo) {
  const colors = {
    fuerza: '#EF4444',
    hipertrofia: '#8B5CF6',
    cardio: '#F59E0B',
    resistencia: '#10B981',
    funcional: '#3B82F6',
    personalizado: '#6B7280'
  };
  return colors[tipo] || colors.personalizado;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#6B7280' },
  header: { backgroundColor: '#fff', padding: 24, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { fontSize: 16, color: '#3B82F6', marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#6B7280' },
  list: { flex: 1, padding: 16 },
  templateCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  templateName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  templateBadges: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  templateInfo: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  infoText: { fontSize: 12, color: '#6B7280' },
  daysContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  dayChip: { backgroundColor: '#E0E7FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  dayChipText: { color: '#3730A3', fontSize: 10, fontWeight: 'bold' },
  useButton: { backgroundColor: '#8B5CF6', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  useButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  modalClose: { fontSize: 28, color: '#6B7280' },
  clientItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  clientName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  clientEmail: { fontSize: 13, color: '#6B7280' },
  emptyText: { textAlign: 'center', color: '#6B7280', fontSize: 14, paddingVertical: 40 },
});