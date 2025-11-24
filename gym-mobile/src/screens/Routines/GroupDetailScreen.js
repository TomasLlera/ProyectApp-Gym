// src/screens/Routines/GroupDetailScreen.js - CON WHATSAPP
import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useDatabase } from '../../context/DatabaseContext';
import whatsappExportService from '../../services/whatsappExportService';

export default function GroupDetailScreen({ route, navigation }) {
  const { group: initialGroup } = route.params;
  const { routines, clients } = useDatabase();

  const [group, setGroup] = useState(initialGroup);
  const [loading, setLoading] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [availableClients, setAvailableClients] = useState([]);

  useFocusEffect(
    React.useCallback(() => {
      refreshGroup();
    }, [])
  );

  const refreshGroup = async () => {
    try {
      console.log('🔄 Actualizando datos del grupo...');

      const groups = await routines.getGrouped();
      const updatedGroup = groups.find(g => g.nombre === group.nombre);

      if (updatedGroup) {
        console.log(`✅ Grupo encontrado: ${updatedGroup.nombre}`);
        console.log(`📊 Clientes en grupo: ${updatedGroup.clientes?.length || 0}`);

        // 🔥 CRÍTICO: Cargar información completa de cada cliente incluyendo teléfono
        if (updatedGroup.clientes && updatedGroup.clientes.length > 0) {
          const clientesCompletos = await Promise.all(
            updatedGroup.clientes.map(async (cliente) => {
              try {
                const clienteId = cliente.id || cliente._id;
                const clienteCompleto = await clients.getById(clienteId);

                if (clienteCompleto) {
                  console.log(`📱 Cliente ${clienteCompleto.nombre}: ${clienteCompleto.telefono || 'SIN TELÉFONO'}`);
                  return clienteCompleto;
                }
                return cliente;
              } catch (error) {
                console.warn(`⚠️ Error cargando cliente ${cliente.nombre}:`, error);
                return cliente;
              }
            })
          );

          updatedGroup.clientes = clientesCompletos;

          // Contar clientes con teléfono
          const conTelefono = clientesCompletos.filter(c => c.telefono).length;
          console.log(`📞 Clientes con teléfono: ${conTelefono}/${clientesCompletos.length}`);
        }

        setGroup(updatedGroup);
      } else {
        console.warn('⚠️ Grupo no encontrado en la lista actualizada');
      }
    } catch (error) {
      console.error('❌ Error refreshing group:', error);
      Alert.alert('Error', 'No se pudieron actualizar los datos del grupo');
    }
  };

  const openAddClientModal = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando clientes para modal...');

      const allClients = await clients.getAll();
      console.log('✅ Clientes cargados:', allClients.length);

      const clientsInGroup = (group.clientes || []).map(c => c.id || c._id || c.clienteId);
      const filtered = allClients.filter(c => {
        const clientId = c.id || c._id;
        return clientId && !clientsInGroup.includes(clientId);
      });

      console.log('✅ Clientes disponibles:', filtered.length);
      setAvailableClients(filtered);
      setShowAddClientModal(true);
    } catch (error) {
      console.error('❌ Error cargando clientes:', error);
      Alert.alert('Error', `No se pudieron cargar los clientes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addClientToGroup = async (clientId) => {
    try {
      console.log('🔄 Agregando cliente al grupo:', clientId);

      const allRoutines = await routines.getAll();
      console.log('✅ Rutinas cargadas:', allRoutines.length);

      const templateRoutine = allRoutines.find(r =>
        r.nombre === group.nombre && r.clienteId !== null
      );

      if (!templateRoutine) {
        Alert.alert('Error', 'No se encontró la plantilla del grupo');
        return;
      }

      console.log('✅ Plantilla encontrada:', templateRoutine.id);

      const templateWithExercises = await routines.getById(templateRoutine.id);
      console.log('✅ Ejercicios cargados:', templateWithExercises.ejercicios?.length || 0);

      const newRoutineData = {
        nombre: templateWithExercises.nombre,
        descripcion: templateWithExercises.descripcion,
        tipo: templateWithExercises.tipo,
        nivel: templateWithExercises.nivel,
        duracionMinutos: templateWithExercises.duracionMinutos || templateWithExercises.duracionEstimada,
        objetivos: templateWithExercises.objetivos,
        diasSemana: templateWithExercises.diasSemana || [],
        ejercicios: templateWithExercises.ejercicios || [],
        activa: true
      };

      const result = await routines.create(clientId, newRoutineData);
      console.log('✅ Rutina creada para cliente:', result.id);

      Alert.alert('Éxito', 'Cliente agregado al grupo');
      setShowAddClientModal(false);
      refreshGroup();
    } catch (error) {
      console.error('❌ Error agregando cliente al grupo:', error);
      Alert.alert('Error', `No se pudo agregar el cliente al grupo: ${error.message}`);
    }
  };

  const removeClientFromGroup = (cliente) => {
    Alert.alert(
      'Quitar del grupo',
      `¿Eliminar rutina de ${cliente.nombre} ${cliente.apellido}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            try {
              const allRoutines = await routines.getAll();
              const routineToDelete = allRoutines.find(r =>
                r.nombre === group.nombre && (r.clienteId === cliente.id || r.clienteId === cliente._id)
              );

              if (routineToDelete) {
                await routines.delete(routineToDelete.id);
                Alert.alert('Éxito', 'Cliente quitado del grupo');
                refreshGroup();
              } else {
                Alert.alert('Error', 'No se encontró la rutina del cliente');
              }
            } catch (error) {
              console.error('Error removing client:', error);
              Alert.alert('Error', 'No se pudo quitar el cliente');
            }
          }
        }
      ]
    );
  };

  const deleteGroup = () => {
    Alert.alert(
      'Eliminar Grupo',
      `¿Eliminar la rutina "${group.nombre}" para TODOS los ${group.cantidad} clientes?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Todo',
          style: 'destructive',
          onPress: async () => {
            try {
              const allRoutines = await routines.getAll();
              const routinesToDelete = allRoutines.filter(r => r.nombre === group.nombre);

              for (const routine of routinesToDelete) {
                await routines.delete(routine.id);
              }

              Alert.alert('Éxito', 'Grupo eliminado', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              console.error('Error deleting group:', error);
              Alert.alert('Error', 'No se pudo eliminar el grupo');
            }
          }
        }
      ]
    );
  };

  // ============================================
  // 📱 FUNCIÓN PARA ENVIAR DIFUSIÓN
  // ============================================
  const enviarDifusionGrupo = async () => {
    try {
      console.log('📱 === INICIO ENVÍO DIFUSIÓN ===');
      console.log('📊 Grupo actual:', group.nombre);
      console.log('👥 Total clientes:', group.clientes?.length || 0);

      if (!group.clientes || group.clientes.length === 0) {
        Alert.alert('Error', 'No hay clientes en este grupo');
        return;
      }

      // 🔍 Debug detallado de cada cliente
      console.log('\n🔍 Revisando clientes:');
      group.clientes.forEach((c, index) => {
        console.log(`\nCliente ${index + 1}:`);
        console.log(`  - Nombre: ${c.nombre} ${c.apellido}`);
        console.log(`  - Email: ${c.email}`);
        console.log(`  - Teléfono: ${c.telefono || '❌ NO TIENE'}`);
        console.log(`  - ID: ${c.id || c._id}`);
      });

      const clientesConTelefono = group.clientes.filter(c => {
        const tieneTelefono = c.telefono && c.telefono.trim() !== '';
        if (!tieneTelefono) {
          console.log(`⚠️ ${c.nombre} ${c.apellido} NO tiene teléfono`);
        }
        return tieneTelefono;
      });

      console.log(`\n📞 Clientes CON teléfono: ${clientesConTelefono.length}`);
      console.log(`❌ Clientes SIN teléfono: ${group.clientes.length - clientesConTelefono.length}`);

      if (clientesConTelefono.length === 0) {
        Alert.alert(
          '📵 Sin Contactos',
          `Ningún cliente de este grupo tiene teléfono registrado.\n\n` +
          `Total clientes: ${group.clientes.length}\n` +
          `Con teléfono: 0\n\n` +
          `Verifica que los clientes tengan teléfonos válidos en formato +54.`,
          [
            {
              text: 'Ver Clientes',
              onPress: () => {
                // Mostrar lista de clientes sin teléfono
                const sinTelefono = group.clientes
                  .filter(c => !c.telefono)
                  .map(c => `• ${c.nombre} ${c.apellido}`)
                  .join('\n');
                Alert.alert('Clientes sin teléfono', sinTelefono || 'Ninguno');
              }
            },
            { text: 'OK' }
          ]
        );
        return;
      }

      // Preparar info de rutina
      const rutinaInfo = {
        nombre: group.nombre,
        tipo: group.tipo,
        nivel: group.nivel,
        duracionEstimada: group.duracionEstimada,
        diasSemana: group.diasSemana || [],
        ejercicios: group.ejercicios || []
      };

      console.log('\n📤 Preparando envío...');
      console.log(`✅ ${clientesConTelefono.length} contactos válidos`);

      Alert.alert(
        '📱 Enviar Difusión',
        `Se enviará la rutina "${group.nombre}" a:\n\n` +
        clientesConTelefono.slice(0, 5).map(c => `• ${c.nombre} ${c.apellido}`).join('\n') +
        (clientesConTelefono.length > 5 ? `\n... y ${clientesConTelefono.length - 5} más` : '') +
        `\n\n✅ ${clientesConTelefono.length} cliente(s) con WhatsApp` +
        (clientesConTelefono.length < group.clientes.length
          ? `\n⚠️ ${group.clientes.length - clientesConTelefono.length} sin teléfono`
          : ''
        ),
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: '📤 Enviar Difusión',
            onPress: () => {
              console.log('✅ Usuario confirmó envío');
              whatsappExportService.crearListaDifusion(
                clientesConTelefono,
                rutinaInfo
              );
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error en enviarDifusionGrupo:', error);
      Alert.alert('Error', `No se pudo enviar la difusión: ${error.message}`);
    }
  };

  // ============================================
  // 📝 CREAR MENSAJE DE VISTA PREVIA
  // ============================================
  const crearMensajeRutinaGrupo = () => {
    return whatsappExportService.crearMensajeDifusion(
      group.clientes.filter(c => c.telefono),
      {
        nombre: group.nombre,
        tipo: group.tipo,
        nivel: group.nivel,
        duracionEstimada: group.duracionEstimada,
        diasSemana: group.diasSemana,
        ejercicios: group.ejercicios
      }
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{group.nombre}</Text>
        <View style={styles.headerBadges}>
          <View style={[styles.badge, { backgroundColor: getTipoColor(group.tipo) }]}>
            <Text style={styles.badgeText}>{group.tipo}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{group.nivel}</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>{group.cantidad} clientes en este grupo</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={openAddClientModal}
        >
          <Text style={styles.actionBtnIcon}>➕</Text>
          <Text style={styles.actionBtnText}>Agregar Cliente</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={enviarDifusionGrupo}
        >
          <Text style={styles.actionBtnIcon}>📱</Text>
          <Text style={styles.actionBtnText}>Difusión</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnDanger]}
          onPress={deleteGroup}
        >
          <Text style={styles.actionBtnIcon}>🗑️</Text>
          <Text style={styles.actionBtnText}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      {/* SECCIÓN DE VISTA PREVIA DEL MENSAJE */}
      <View style={styles.previewSection}>
        <Text style={styles.previewTitle}>📝 Vista Previa del Mensaje</Text>
        <TouchableOpacity
          style={styles.previewButton}
          onPress={() => {
            const mensaje = crearMensajeRutinaGrupo();
            Alert.alert(
              'Vista Previa',
              mensaje,
              [
                { text: 'Cerrar', style: 'cancel' },
                {
                  text: '📤 Enviar Ahora',
                  onPress: enviarDifusionGrupo
                }
              ]
            );
          }}
        >
          <Text style={styles.previewButtonText}>👁️ Ver Mensaje</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Clientes del Grupo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clientes ({group.cantidad})</Text>


          {group.clientes?.length > 0 ? (
            group.clientes.map((cliente, index) => (
              <View key={cliente.id || cliente._id || cliente.clienteId || `client-${index}`} style={styles.clientCard}>
                <View style={styles.clientAvatar}>
                  <Text style={styles.clientAvatarText}>
                    {cliente.nombre?.charAt(0)}{cliente.apellido?.charAt(0)}
                  </Text>
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>
                    {cliente.nombre} {cliente.apellido}
                  </Text>
                  <Text style={styles.clientEmail}>{cliente.email}</Text>
                  {cliente.telefono && (
                    <Text style={styles.clientPhone}>📱 {cliente.telefono}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeClientFromGroup(cliente)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay clientes en este grupo</Text>
          )}
        </View>

        {/* Info de la Rutina */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de la Rutina</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duración estimada</Text>
            <Text style={styles.infoValue}>⏱️ {group.duracionEstimada} minutos</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Días de entrenamiento</Text>
            <View style={styles.daysContainer}>
              {group.diasSemana?.map((dia) => (
                <View key={dia} style={styles.dayChip}>
                  <Text style={styles.dayChipText}>{dia.slice(0, 3).toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Ejercicios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Ejercicios ({group.ejercicios?.length || 0})
          </Text>

          {group.ejercicios?.sort((a, b) => a.orden - b.orden).map((ejercicio, index) => (
            <View key={ejercicio.id || ejercicio._id || `ejercicio-${index}`} style={styles.exerciseCard}>
              <View style={styles.exerciseNumber}>
                <Text style={styles.exerciseNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseContent}>
                <Text style={styles.exerciseName}>{ejercicio.nombre}</Text>
                <Text style={styles.exerciseDetails}>
                  {ejercicio.series}x{ejercicio.repeticiones} • {ejercicio.peso} • {ejercicio.descanso}
                </Text>
                <View style={[styles.grupoMuscular, { backgroundColor: getGrupoColor(ejercicio.grupoMuscular) }]}>
                  <Text style={styles.grupoMuscularText}>{ejercicio.grupoMuscular}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            ⚠️ Para editar esta rutina, se actualizará para TODOS los {group.cantidad} clientes del grupo
          </Text>
        </View>
      </ScrollView>

      {/* Add Client Modal */}
      <Modal
        visible={showAddClientModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddClientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar Cliente al Grupo</Text>
              <TouchableOpacity onPress={() => setShowAddClientModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={availableClients}
              keyExtractor={(item) => item.id || item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalClientItem}
                  onPress={() => addClientToGroup(item.id || item._id)}
                >
                  <Text style={styles.modalClientName}>
                    {item.nombre} {item.apellido}
                  </Text>
                  <Text style={styles.modalClientEmail}>{item.email}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Todos los clientes ya están en este grupo
                </Text>
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
    personalizado: '#FF6B35'
  };
  return colors[tipo] || colors.personalizado;
}

function getGrupoColor(grupo) {
  const colors = {
    pecho: '#EF4444',
    espalda: '#3B82F6',
    piernas: '#10B981',
    hombros: '#F59E0B',
    brazos: '#8B5CF6', abdominales: '#EC4899',
    cardio: '#F97316',
    fullbody: '#6B7280'
  };
  return colors[grupo] || colors.fullbody;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    backgroundColor: '#1A1A1A',
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 3,
    borderBottomColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    fontSize: 16,
    color: '#FF6B35',
    marginBottom: 12,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8
  },
  headerBadges: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#6B7280',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FF8456'
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 50,
  },
  actionBtnPrimary: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  actionBtnSecondary: {
    backgroundColor: '#25D366',
    borderColor: '#128C7E',
  },
  actionBtnDanger: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  actionBtnIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  // ============================================
  // 📝 ESTILOS VISTA PREVIA
  // ============================================
  previewSection: {
    backgroundColor: '#FFF5F2',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  previewButton: {
    backgroundColor: '#25D366',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#128C7E',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  content: { flex: 1 },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
    borderWidth: 1,
    borderColor: '#FFE5DC',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFD4C4',
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E55A2B',
  },
  clientAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold'
  },
  clientInfo: { flex: 1 },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A'
  },
  clientEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  clientPhone: {
    fontSize: 12,
    color: '#25D366',
    marginTop: 2,
    fontWeight: '500',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  removeButtonText: {
    color: '#DC2626',
    fontSize: 18,
    fontWeight: 'bold'
  },
  infoRow: { marginBottom: 16 },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8
  },
  infoValue: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600'
  },
  daysContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dayChip: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E55A2B',
  },
  dayChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold'
  },
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E55A2B',
  },
  exerciseNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold'
  },
  exerciseContent: { flex: 1 },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4
  },
  exerciseDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6
  },
  grupoMuscular: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  grupoMuscularText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  warningBox: {
    backgroundColor: '#FFE5DC',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
    borderWidth: 1,
    borderColor: '#FFD4C4',
  },
  warningText: {
    fontSize: 13,
    color: '#E55A2B',
    lineHeight: 18
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.7)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    borderTopWidth: 4,
    borderTopColor: '#FF6B35',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#FFE5DC'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A'
  },
  modalClose: {
    fontSize: 28,
    color: '#6B7280'
  },
  modalClientItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  modalClientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4
  },
  modalClientEmail: {
    fontSize: 13,
    color: '#6B7280'
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    paddingVertical: 40
  },
});