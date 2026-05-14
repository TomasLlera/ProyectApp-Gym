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
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../../context/DatabaseContext';
import whatsappExportService from '../../services/whatsappExportService';

export default function GroupDetailScreen({ route, navigation }) {
  const { group: initialGroup } = route.params;
  const { routines, clients } = useDatabase();

  const [group, setGroup] = useState(initialGroup);
  const [loading, setLoading] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [availableClients, setAvailableClients] = useState([]);
  const [expandedClients, setExpandedClients] = useState(new Set());
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewMessage, setPreviewMessage] = useState('');
  const [showEjercicios, setShowEjercicios] = useState(false);

  const toggleExpand = (clientId) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  };

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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color="#F97316" />
          <Text style={styles.backButtonText}>Volver</Text>
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
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={openAddClientModal}>
          <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>Agregar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPreview]}
          onPress={() => {
            const mensaje = crearMensajeRutinaGrupo();
            setPreviewMessage(mensaje);
            setShowPreviewModal(true);
          }}
        >
          <Ionicons name="eye-outline" size={18} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>Preview</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={enviarDifusionGrupo}>
          <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>Difusión</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnEdit]}
          onPress={() => {
            Alert.alert(
              'Editar Rutina',
              `Esta acción actualizará la rutina para TODOS los ${group.cantidad} cliente(s) del grupo.\n\n¿Deseas continuar?`,
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Editar', onPress: () => navigation.navigate('CreateRoutine', { groupToEdit: group }) }
              ]
            );
          }}
        >
          <Ionicons name="create-outline" size={18} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={deleteGroup}>
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>Eliminar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Clientes del Grupo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clientes ({group.cantidad})</Text>


          {group.clientes?.length > 0 ? (
            group.clientes.map((cliente, index) => {
              const clientId = cliente.id || cliente._id || cliente.clienteId || `client-${index}`;
              const isExpanded = expandedClients.has(clientId);
              return (
                <View key={clientId} style={styles.clientCard}>
                  {/* Fila principal compacta */}
                  <View style={styles.clientRow}>
                    <View style={styles.clientAvatar}>
                      <Text style={styles.clientAvatarText}>
                        {cliente.nombre?.charAt(0)}{cliente.apellido?.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>
                        {cliente.nombre} {cliente.apellido}
                      </Text>
                      {cliente.telefono ? (
                        <View style={styles.phoneRow}>
                          <Ionicons name="call-outline" size={10} color="#25D366" />
                          <Text style={styles.clientPhone}>{cliente.telefono}</Text>
                        </View>
                      ) : (
                        <Text style={styles.clientEmail}>{cliente.email}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.expandBtn}
                      onPress={() => toggleExpand(clientId)}
                    >
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={isExpanded ? '#F97316' : '#71717A'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeClientFromGroup(cliente)}
                    >
                      <Ionicons name="trash-outline" size={13} color="#DC2626" />
                    </TouchableOpacity>
                  </View>

                  {/* Detalle expandible */}
                  {isExpanded && (
                    <View style={styles.clientDetail}>
                      <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={12} color="#71717A" />
                        <Text style={styles.detailText}>
                          {group.diasSemana?.length > 0
                            ? group.diasSemana.map(d => d.slice(0, 3).toUpperCase()).join(' · ')
                            : 'Sin días definidos'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="timer-outline" size={12} color="#71717A" />
                        <Text style={styles.detailText}>{group.duracionEstimada} min</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Ionicons name="barbell-outline" size={12} color="#71717A" />
                        <Text style={styles.detailText}>{group.ejercicios?.length || 0} ejercicios</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No hay clientes en este grupo</Text>
          )}
        </View>

        {/* Info de la Rutina */}
        <View style={styles.infoBar}>
          <View style={styles.infoStat}>
            <Ionicons name="timer-outline" size={14} color="#71717A" />
            <Text style={styles.infoStatText}>{group.duracionEstimada} min</Text>
          </View>
          <View style={styles.infoStatDot} />
          <View style={styles.infoStat}>
            <Ionicons name="barbell-outline" size={14} color="#71717A" />
            <Text style={styles.infoStatText}>{group.ejercicios?.length || 0} ejerc.</Text>
          </View>
          <View style={styles.infoStatDot} />
          <View style={styles.infoStatDays}>
            {group.diasSemana?.map((dia) => (
              <View key={dia} style={styles.dayChip}>
                <Text style={styles.dayChipText}>{dia.slice(0, 3).toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Ejercicios */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionToggleRow}
            onPress={() => setShowEjercicios(v => !v)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.sectionTitle}>
                Ejercicios ({group.ejercicios?.length || 0})
              </Text>
            </View>
            <View style={styles.toggleChip}>
              <Text style={styles.toggleChipText}>{showEjercicios ? 'Ocultar' : 'Ver'}</Text>
              <Ionicons
                name={showEjercicios ? 'chevron-up' : 'chevron-down'}
                size={13}
                color="#F97316"
              />
            </View>
          </TouchableOpacity>

          {showEjercicios && group.ejercicios?.sort((a, b) => a.orden - b.orden).map((ejercicio, index) => (
            <View key={ejercicio.id || ejercicio._id || `ejercicio-${index}`} style={styles.exerciseCard}>
              <View style={styles.exerciseNumber}>
                <Text style={styles.exerciseNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseContent}>
                <Text style={styles.exerciseName}>{ejercicio.nombre}</Text>
                <Text style={styles.exerciseDetails}>
                  {ejercicio.series}x{ejercicio.repeticiones} • {ejercicio.peso} • {ejercicio.descanso}
                </Text>
                <View style={[styles.grupoMuscular, { backgroundColor: getGrupoColor(ejercicio.grupoMuscular) + '22', borderColor: getGrupoColor(ejercicio.grupoMuscular) + '60', borderWidth: 1 }]}>
                  <Text style={[styles.grupoMuscularText, { color: getGrupoColor(ejercicio.grupoMuscular) }]}>{ejercicio.grupoMuscular}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Preview Modal */}
      <Modal
        visible={showPreviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#3B82F622', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="eye-outline" size={16} color="#3B82F6" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Vista Previa</Text>
                  <Text style={{ fontSize: 11, color: '#71717A' }}>Mensaje que recibirán los clientes</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </TouchableOpacity>
            </View>

            {/* Burbuja de chat */}
            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              <View style={styles.chatBubble}>
                <Text style={styles.chatBubbleText}>{previewMessage}</Text>
              </View>
              <Text style={styles.previewNote}>
                Este mensaje se enviará a {group.clientes?.filter(c => c.telefono).length || 0} cliente(s) con WhatsApp
              </Text>
            </ScrollView>

            <View style={styles.previewFooter}>
              <TouchableOpacity
                style={styles.previewCancelBtn}
                onPress={() => setShowPreviewModal(false)}
              >
                <Text style={styles.previewCancelText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewSendBtn}
                onPress={() => { setShowPreviewModal(false); enviarDifusionGrupo(); }}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                <Text style={styles.previewSendText}>Enviar Difusión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              <TouchableOpacity onPress={() => setShowAddClientModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#A1A1AA" />
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
    personalizado: '#F97316'
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
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  header: {
    backgroundColor: '#1A1A1A',
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 3,
    borderBottomColor: '#F97316',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#F97316',
    fontWeight: '600',
    marginLeft: 2,
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
    color: '#F97316'
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  actionBtnPrimary: { backgroundColor: '#10B981' },
  actionBtnPreview: { backgroundColor: '#3B82F6' },
  actionBtnSecondary: { backgroundColor: '#25D366' },
  actionBtnEdit: { backgroundColor: '#F59E0B' },
  actionBtnDanger: { backgroundColor: '#EF4444' },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  content: { flex: 1 },
  section: {
    backgroundColor: '#1C1C1E',
    margin: 16,
    marginTop: 0,
    padding: 14,
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#F97316',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5F5F5',
    marginBottom: 0,
  },
  sectionToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9731622',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F9731640',
  },
  toggleChipText: {
    fontSize: 11,
    color: '#F97316',
    fontWeight: '600',
  },
  clientCard: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderLeftWidth: 3,
    borderLeftColor: '#F97316',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#EA6C0A',
  },
  clientAvatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  clientInfo: { flex: 1 },
  clientName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F5F5F5',
  },
  clientEmail: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 1,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  clientPhone: {
    fontSize: 11,
    color: '#25D366',
    fontWeight: '500',
  },
  expandBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  removeButton: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#450A0A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7C2D12',
  },
  clientDetail: {
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
    marginTop: 8,
    paddingTop: 8,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    color: '#71717A',
    fontWeight: '500',
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    gap: 8,
    flexWrap: 'wrap',
  },
  infoStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoStatText: {
    fontSize: 12,
    color: '#A1A1AA',
    fontWeight: '500',
  },
  infoStatDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#3F3F46',
  },
  infoStatDays: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  dayChip: {
    backgroundColor: '#431407',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F97316',
  },
  dayChipText: {
    color: '#EA6C0A',
    fontSize: 11,
    fontWeight: '700',
  },
  exerciseCard: {
    flexDirection: 'row',
    backgroundColor: '#0F0F0F',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F97316',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#EA6C0A',
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
    color: '#F5F5F5',
    marginBottom: 4
  },
  exerciseDetails: {
    fontSize: 12,
    color: '#A1A1AA',
    marginBottom: 6
  },
  grupoMuscular: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  grupoMuscularText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.7)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    borderTopWidth: 4,
    borderTopColor: '#F97316',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#2C2C2E'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5F5F5'
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalClientItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E'
  },
  modalClientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F5F5',
    marginBottom: 4
  },
  modalClientEmail: {
    fontSize: 13,
    color: '#A1A1AA'
  },
  emptyText: {
    textAlign: 'center',
    color: '#A1A1AA',
    fontSize: 14,
    paddingVertical: 40
  },
  chatBubble: {
    backgroundColor: '#25D36618',
    borderWidth: 1,
    borderColor: '#25D36630',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 14,
    marginBottom: 12,
  },
  chatBubbleText: {
    fontSize: 13,
    color: '#E4E4E7',
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  previewNote: {
    fontSize: 11,
    color: '#52525B',
    textAlign: 'center',
    marginBottom: 8,
  },
  previewFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  previewCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
  },
  previewCancelText: {
    color: '#A1A1AA',
    fontSize: 14,
    fontWeight: '600',
  },
  previewSendBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#25D366',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  previewSendText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});