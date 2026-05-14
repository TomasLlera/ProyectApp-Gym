// src/screens/Routines/RoutineDetailScreen.js
import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../../context/DatabaseContext';

const GRUPO_INFO = {
  pecho:       { icon: 'body-outline',          color: '#EF4444' },
  espalda:     { icon: 'fitness-outline',       color: '#3B82F6' },
  piernas:     { icon: 'walk-outline',          color: '#10B981' },
  hombros:     { icon: 'trending-up-outline',   color: '#F59E0B' },
  brazos:      { icon: 'barbell-outline',       color: '#8B5CF6' },
  abdominales: { icon: 'layers-outline',        color: '#EC4899' },
  cardio:      { icon: 'heart-outline',         color: '#F97316' },
};

function getGrupoInfo(grupo) {
  return GRUPO_INFO[grupo] || { icon: 'barbell-outline', color: '#6B7280' };
}

function getTipoColor(tipo) {
  const colors = {
    fuerza:       '#EF4444',
    hipertrofia:  '#8B5CF6',
    cardio:       '#F59E0B',
    resistencia:  '#10B981',
    funcional:    '#3B82F6',
    personalizado:'#F97316',
  };
  return colors[tipo] || colors.personalizado;
}

export default function RoutineDetailScreen({ route, navigation }) {
  const { routineId } = route.params;
  const { routines } = useDatabase();

  const [routine, setRoutine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMessage, setPreviewMessage] = useState('');
  const [pendingPhone, setPendingPhone] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadRoutine();
    }, [routineId])
  );

  const loadRoutine = async () => {
    try {
      const routineData = await routines.getById(routineId);
      setRoutine(routineData);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo cargar la rutina');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const deleteRoutine = () => {
    Alert.alert(
      'Eliminar Rutina',
      `¿Eliminar "${routine?.nombre}"?\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await routines.delete(routineId);
              Alert.alert('Éxito', 'Rutina eliminada', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la rutina');
            }
          }
        }
      ]
    );
  };

  const buildMessage = () => {
    let msg = `🏋️ *${routine.nombre}*\n\n`;
    msg += `📋 Tipo: ${routine.tipo}\n`;
    msg += `🎯 Nivel: ${routine.nivel}\n`;
    msg += `⏱️ Duración: ${routine.duracionEstimada} min\n\n`;
    if (routine.descripcion) msg += `📝 ${routine.descripcion}\n\n`;
    msg += `💪 *Ejercicios (${routine.ejercicios?.length || 0}):*\n\n`;
    routine.ejercicios?.forEach((ej, i) => {
      msg += `${i + 1}. *${ej.nombre}*\n`;
      msg += `   ${ej.series}x${ej.repeticiones}`;
      if (ej.peso && ej.peso !== 'A definir') msg += ` - ${ej.peso}`;
      msg += `\n   Descanso: ${ej.descanso}\n`;
      if (ej.grupoMuscular) msg += `   🎯 ${ej.grupoMuscular}\n`;
      if (ej.notas) msg += `   💡 ${ej.notas}\n`;
      msg += `\n`;
    });
    msg += `\n📍 O2 Gym\n💪 ¡Vamos por esos objetivos!`;
    return msg;
  };

  const shareRoutine = () => {
    if (!routine) return;
    const phone = routine.cliente?.telefono;
    if (!phone) {
      Alert.alert('Error', 'El cliente no tiene teléfono registrado');
      return;
    }
    let clean = phone.replace(/[^0-9+]/g, '');
    if (clean.startsWith('54') && !clean.startsWith('+54')) clean = '+' + clean;
    else if (!clean.startsWith('+54')) clean = '+54' + clean.replace(/^0/, '');
    const number = clean.replace('+', '');
    const message = buildMessage();
    setPreviewMessage(message);
    setPendingPhone(number);
    setShowPreview(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="barbell-outline" size={48} color="#F97316" style={{ marginBottom: 14 }} />
        <Text style={styles.loadingText}>Cargando rutina...</Text>
      </View>
    );
  }

  const tipoColor = getTipoColor(routine.tipo);

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButtonRow} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={18} color="#F97316" />
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>

          <Text style={styles.title}>{routine.nombre}</Text>

          {(routine.cliente?.nombre || routine.cliente?.apellido) && (
            <View style={styles.clientRow}>
              <Ionicons name="person-outline" size={13} color="#F97316" />
              <Text style={styles.clientName}>
                {routine.cliente.nombre} {routine.cliente.apellido}
              </Text>
            </View>
          )}

          <View style={styles.badgesRow}>
            <View style={[styles.tipoBadge, { backgroundColor: tipoColor + '22', borderColor: tipoColor + '60' }]}>
              <Text style={[styles.tipoBadgeText, { color: tipoColor }]}>{routine.tipo?.toUpperCase()}</Text>
            </View>
            <View style={styles.nivelBadge}>
              <Text style={styles.nivelBadgeText}>{routine.nivel?.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Info bar */}
        <View style={styles.infoBar}>
          <View style={styles.infoStat}>
            <Ionicons name="timer-outline" size={13} color="#71717A" />
            <Text style={styles.infoStatText}>{routine.duracionEstimada} min</Text>
          </View>
          <View style={styles.infoStatDot} />
          <View style={styles.infoStat}>
            <Ionicons name="barbell-outline" size={13} color="#71717A" />
            <Text style={styles.infoStatText}>{routine.ejercicios?.length || 0} ejerc.</Text>
          </View>
          {routine.diasSemana?.length > 0 && (
            <>
              <View style={styles.infoStatDot} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysContent}>
                {routine.diasSemana.map(dia => (
                  <View key={dia} style={styles.dayChip}>
                    <Text style={styles.dayChipText}>{dia.slice(0, 3).toUpperCase()}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}
        </View>

        {routine.descripcion ? (
          <View style={styles.descriptionBox}>
            <Ionicons name="document-text-outline" size={13} color="#52525B" style={{ marginRight: 6, marginTop: 1 }} />
            <Text style={styles.descriptionText}>{routine.descripcion}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#25D366', borderColor: '#128C7E' }]}
            onPress={shareRoutine}
          >
            <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#F59E0B', borderColor: '#D97706' }]}
            onPress={() => navigation.navigate('CreateRoutine', { routineId, rutina: routine })}
          >
            <Ionicons name="create-outline" size={15} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#EF4444', borderColor: '#B91C1C' }]}
            onPress={deleteRoutine}
          >
            <Ionicons name="trash-outline" size={15} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Eliminar</Text>
          </TouchableOpacity>
        </View>

        {/* Exercises section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
              <Ionicons name="barbell-outline" size={15} color="#F97316" />
            </View>
            <Text style={styles.sectionTitle}>Ejercicios ({routine.ejercicios?.length || 0})</Text>
          </View>

          {routine.ejercicios?.sort((a, b) => a.orden - b.orden).map((ejercicio, index) => {
            const grupoInfo = getGrupoInfo(ejercicio.grupoMuscular);
            return (
              <View key={index} style={[styles.exerciseCard, { borderLeftColor: grupoInfo.color }]}>
                <View style={[styles.grupoIcon, { backgroundColor: grupoInfo.color + '22' }]}>
                  <Ionicons name={grupoInfo.icon} size={18} color={grupoInfo.color} />
                </View>

                <View style={styles.exerciseContent}>
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseNumber}>
                      <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.exerciseName} numberOfLines={1}>{ejercicio.nombre}</Text>
                    {ejercicio.grupoMuscular && (
                      <View style={[styles.grupoBadge, { backgroundColor: grupoInfo.color + '22', borderColor: grupoInfo.color + '60' }]}>
                        <Text style={[styles.grupoBadgeText, { color: grupoInfo.color }]}>{ejercicio.grupoMuscular.toUpperCase()}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.exerciseStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="repeat-outline" size={12} color="#71717A" />
                      <Text style={styles.statText}>{ejercicio.series}x{ejercicio.repeticiones}</Text>
                    </View>
                    {ejercicio.peso && ejercicio.peso !== 'A definir' && (
                      <>
                        <View style={styles.statDot} />
                        <View style={styles.statItem}>
                          <Ionicons name="barbell-outline" size={12} color="#71717A" />
                          <Text style={styles.statText}>{ejercicio.peso}</Text>
                        </View>
                      </>
                    )}
                    <View style={styles.statDot} />
                    <View style={styles.statItem}>
                      <Ionicons name="timer-outline" size={12} color="#71717A" />
                      <Text style={styles.statText}>{ejercicio.descanso}</Text>
                    </View>
                  </View>

                  {ejercicio.notas ? (
                    <View style={styles.notesRow}>
                      <Ionicons name="information-circle-outline" size={12} color="#52525B" />
                      <Text style={styles.exerciseNotes}>{ejercicio.notas}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* WhatsApp Preview Modal */}
      <Modal visible={showPreview} animationType="slide" transparent onRequestClose={() => setShowPreview(false)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewSheet}>
            <View style={styles.previewHandle} />
            <View style={styles.previewHeader}>
              <View style={styles.previewIconBox}>
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              </View>
              <Text style={styles.previewTitle}>Vista Previa</Text>
              <TouchableOpacity onPress={() => setShowPreview(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              <View style={styles.chatBubble}>
                <Text style={styles.chatBubbleText}>{previewMessage}</Text>
              </View>
            </ScrollView>
            <View style={styles.previewFooter}>
              <TouchableOpacity style={styles.previewCancelBtn} onPress={() => setShowPreview(false)}>
                <Text style={styles.previewCancelText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewSendBtn}
                onPress={() => { setShowPreview(false); Linking.openURL(`https://wa.me/${pendingPhone}?text=${encodeURIComponent(previewMessage)}`); }}
              >
                <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
                <Text style={styles.previewSendText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F0F0F' },
  loadingText: { fontSize: 16, color: '#A1A1AA' },

  // Header
  header: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 3,
    borderBottomColor: '#F97316',
  },
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 4,
  },
  backButtonText: { fontSize: 14, color: '#F97316', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: '#F5F5F5', marginBottom: 6 },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  clientName: { fontSize: 14, color: '#F97316', fontWeight: '600' },
  badgesRow: { flexDirection: 'row', gap: 8 },
  tipoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  tipoBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  nivelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  nivelBadgeText: { fontSize: 11, fontWeight: '700', color: '#71717A', letterSpacing: 0.4 },

  // Info bar
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    gap: 10,
  },
  infoStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoStatText: { fontSize: 12, color: '#A1A1AA', fontWeight: '500' },
  infoStatDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#3F3F46' },
  daysContent: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dayChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F9731622',
    borderWidth: 1,
    borderColor: '#F9731660',
  },
  dayChipText: { fontSize: 10, fontWeight: '700', color: '#F97316' },

  // Description
  descriptionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  descriptionText: { flex: 1, fontSize: 13, color: '#A1A1AA', lineHeight: 18 },

  // Actions
  actions: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // Section
  section: {
    backgroundColor: '#1C1C1E',
    margin: 16,
    marginTop: 4,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F9731622',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#F5F5F5' },

  // Exercise cards
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  grupoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  exerciseContent: { flex: 1 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  exerciseNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumberText: { fontSize: 11, fontWeight: '800', color: '#A1A1AA' },
  exerciseName: { fontSize: 14, fontWeight: '700', color: '#F5F5F5', flex: 1 },
  grupoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  grupoBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  exerciseStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText: { fontSize: 12, color: '#71717A', fontWeight: '500' },
  statDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#3F3F46' },
  notesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 6 },
  exerciseNotes: { flex: 1, fontSize: 12, color: '#52525B', fontStyle: 'italic' },

  // Preview modal
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  previewSheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    borderTopWidth: 4,
    borderTopColor: '#25D366',
  },
  previewHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3F3F46',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    gap: 10,
  },
  previewIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#25D36622',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#F5F5F5' },
  chatBubble: {
    backgroundColor: '#25D36618',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#25D36640',
    padding: 14,
  },
  chatBubbleText: { fontSize: 13, color: '#D1FAE5', lineHeight: 20, fontFamily: 'monospace' },
  previewFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  previewCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
  },
  previewCancelText: { fontSize: 14, fontWeight: '600', color: '#A1A1AA' },
  previewSendBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewSendText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
