// src/screens/Profile/ProfileScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../../context/DatabaseContext';
import { useAppConfig } from '../../context/AppConfigContext';
import backupService from '../../services/backupService';

export default function ProfileScreen({ navigation }) {
  const { clients } = useDatabase();
  const { appName, adminProfile, updateAppName, updateAdminProfile } = useAppConfig();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAppName, setEditAppName] = useState('');

  const openEditModal = () => {
    setEditName(adminProfile.name || '');
    setEditEmail(adminProfile.email || '');
    setEditPhone(adminProfile.phone || '');
    setEditAppName(appName || '');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }
    if (editEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail)) {
      Alert.alert('Error', 'Ingresá un email válido');
      return;
    }
    try {
      const profileUpdated = await updateAdminProfile({
        ...adminProfile,
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
      });
      if (editAppName.trim() && editAppName.trim() !== appName) {
        await updateAppName(editAppName.trim());
      }
      if (profileUpdated) {
        setShowEditModal(false);
        Alert.alert('Éxito', 'Perfil actualizado');
      } else {
        Alert.alert('Error', 'No se pudo guardar');
      }
    } catch {
      Alert.alert('Error', 'Ocurrió un error al guardar');
    }
  };

  const exportFullBackup = async () => {
    try {
      const result = await backupService.exportData();
      Alert.alert(
        'Backup Creado',
        `Archivo: ${result.fileName}\n\n` +
        `• ${result.metadata.totalClientes} clientes\n` +
        `• ${result.metadata.totalRutinas || 0} rutinas\n` +
        `• ${result.metadata.totalPlantillas || 0} plantillas\n` +
        `• ${result.metadata.totalPagos} pagos`
      );
    } catch (e) {
      Alert.alert('Error', `No se pudo crear el backup:\n${e.message}`);
    }
  };

  const exportClientsJSON = async () => {
    try {
      const result = await backupService.exportClientsOnly();
      Alert.alert('Clientes Exportados', `${result.metadata.totalClientes} clientes → ${result.fileName}`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const exportClientsCSV = async () => {
    try {
      const result = await backupService.exportToCSV();
      Alert.alert('CSV Creado', `${result.totalClientes} clientes → ${result.fileName}\n\nAbrí en Excel o Google Sheets.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const importData = () => {
    Alert.alert(
      'Importar Backup',
      'Esta acción reemplazará TODOS los datos actuales y no se puede deshacer.\n\n¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Backup primero', onPress: exportFullBackup },
        {
          text: 'Importar ahora',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await backupService.importData();
              if (result.success) {
                Alert.alert('Importación completada', result.message, [
                  { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] }) }
                ]);
              } else {
                Alert.alert('Info', result.message);
              }
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      icon: 'bar-chart-outline',
      color: '#8B5CF6',
      title: 'Estadísticas',
      subtitle: 'Reportes completos de ingresos y clientes',
      onPress: () => navigation.navigate('Statistics'),
    },
    {
      icon: 'person-outline',
      color: '#F97316',
      title: 'Editar Perfil',
      subtitle: 'Nombre, email, teléfono y nombre del gimnasio',
      onPress: openEditModal,
    },
    {
      icon: 'notifications-outline',
      color: '#F59E0B',
      title: 'Notificaciones',
      subtitle: 'Gestionar alertas y recordatorios',
      onPress: () => Alert.alert('Próximamente', 'Configuración de notificaciones en desarrollo'),
    },
    {
      icon: 'save-outline',
      color: '#10B981',
      title: 'Respaldo de Datos',
      subtitle: 'Exportar e importar información',
      onPress: () => setShowBackupModal(true),
    },
    {
      icon: 'card-outline',
      color: '#3B82F6',
      title: 'Métodos de Pago',
      subtitle: 'Configurar formas de cobro',
      onPress: () => Alert.alert('Próximamente', 'Configuración de pagos en desarrollo'),
    },
    {
      icon: 'calendar-outline',
      color: '#EC4899',
      title: 'Google Calendar',
      subtitle: 'Sincronizar rutinas automáticamente',
      onPress: () => navigation.navigate('GoogleCalendar'),
    },
    {
      icon: 'help-circle-outline',
      color: '#71717A',
      title: 'Ayuda y Soporte',
      subtitle: 'Centro de ayuda',
      onPress: () => Alert.alert('Ayuda', 'Para soporte contactá al desarrollador'),
    },
  ];

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarBox}>
            <Ionicons name="person" size={38} color="#FFFFFF" />
          </View>
          <Text style={styles.name}>{adminProfile.name || 'Administrador'}</Text>
          {adminProfile.email ? <Text style={styles.email}>{adminProfile.email}</Text> : null}
          <View style={styles.gymBadge}>
            <Ionicons name="fitness-outline" size={13} color="#F97316" />
            <Text style={styles.gymBadgeText}>{appName}</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, index === menuItems.length - 1 && { borderBottomWidth: 0 }]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: item.color + '22' }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#3F3F46" />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.versionText}>O2 Gym · v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetIconBox}>
                <Ionicons name="person-outline" size={18} color="#F97316" />
              </View>
              <Text style={styles.sheetTitle}>Editar Perfil</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.sheetBody}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nombre</Text>
                <View style={styles.fieldRow}>
                  <Ionicons name="person-outline" size={16} color="#52525B" />
                  <TextInput
                    style={styles.fieldInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Tu nombre completo"
                    placeholderTextColor="#52525B"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email</Text>
                <View style={styles.fieldRow}>
                  <Ionicons name="mail-outline" size={16} color="#52525B" />
                  <TextInput
                    style={styles.fieldInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    placeholder="tu@email.com"
                    placeholderTextColor="#52525B"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Teléfono</Text>
                <View style={styles.fieldRow}>
                  <Ionicons name="call-outline" size={16} color="#52525B" />
                  <TextInput
                    style={styles.fieldInput}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="+54 9 11 1234-5678"
                    placeholderTextColor="#52525B"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nombre del Gimnasio</Text>
                <View style={styles.fieldRow}>
                  <Ionicons name="fitness-outline" size={16} color="#52525B" />
                  <TextInput
                    style={styles.fieldInput}
                    value={editAppName}
                    onChangeText={setEditAppName}
                    placeholder="Ej: O2 Gym"
                    placeholderTextColor="#52525B"
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Backup Modal */}
      <Modal visible={showBackupModal} animationType="slide" transparent onRequestClose={() => setShowBackupModal(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { height: 'auto' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIconBox, { backgroundColor: '#10B98122' }]}>
                <Ionicons name="server-outline" size={18} color="#10B981" />
              </View>
              <Text style={styles.sheetTitle}>Respaldo de Datos</Text>
              <TouchableOpacity onPress={() => setShowBackupModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color="#A1A1AA" />
              </TouchableOpacity>
            </View>

            <View style={styles.sheetBody}>
              <Text style={styles.backupSectionLabel}>EXPORTAR</Text>
              {[
                { icon: 'archive-outline', color: '#F97316', title: 'Backup Completo', subtitle: 'Todos los datos en JSON', onPress: exportFullBackup },
                { icon: 'people-outline', color: '#3B82F6', title: 'Solo Clientes (JSON)', subtitle: 'Lista de clientes', onPress: exportClientsJSON },
                { icon: 'document-text-outline', color: '#10B981', title: 'Clientes en CSV', subtitle: 'Compatible con Excel y Google Sheets', onPress: exportClientsCSV },
              ].map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.backupOption}
                  onPress={() => { setShowBackupModal(false); opt.onPress(); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.backupIconBox, { backgroundColor: opt.color + '22' }]}>
                    <Ionicons name={opt.icon} size={20} color={opt.color} />
                  </View>
                  <View style={styles.backupOptionText}>
                    <Text style={styles.backupOptionTitle}>{opt.title}</Text>
                    <Text style={styles.backupOptionSubtitle}>{opt.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#3F3F46" />
                </TouchableOpacity>
              ))}

              <Text style={[styles.backupSectionLabel, { marginTop: 16 }]}>IMPORTAR</Text>
              <TouchableOpacity
                style={[styles.backupOption, { borderColor: '#7F1D1D' }]}
                onPress={() => { setShowBackupModal(false); importData(); }}
                activeOpacity={0.7}
              >
                <View style={[styles.backupIconBox, { backgroundColor: '#EF444418' }]}>
                  <Ionicons name="cloud-download-outline" size={20} color="#EF4444" />
                </View>
                <View style={styles.backupOptionText}>
                  <Text style={styles.backupOptionTitle}>Importar Backup</Text>
                  <Text style={[styles.backupOptionSubtitle, { color: '#EF4444' }]}>Reemplaza todos los datos actuales</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#3F3F46" />
              </TouchableOpacity>

              <View style={{ height: 24 }} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F0F' },

  // Header
  header: {
    backgroundColor: '#1A1A1A',
    paddingTop: 56,
    paddingBottom: 28,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#F97316',
  },
  avatarBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#EA6C0A',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  name: { fontSize: 22, fontWeight: '800', color: '#F5F5F5', marginBottom: 4 },
  email: { fontSize: 13, color: '#71717A', marginBottom: 12 },
  gymBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9731622',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F9731660',
  },
  gymBadgeText: { fontSize: 13, color: '#F97316', fontWeight: '700' },

  // Menu
  menuContainer: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    gap: 12,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '600', color: '#F5F5F5', marginBottom: 2 },
  menuSubtitle: { fontSize: 12, color: '#71717A' },

  versionText: { textAlign: 'center', fontSize: 12, color: '#3F3F46', marginTop: 24 },

  // Bottom sheet shared
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    borderTopWidth: 4,
    borderTopColor: '#F97316',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3F3F46',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    gap: 10,
  },
  sheetIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F9731622',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#F5F5F5' },
  sheetBody: { padding: 16 },
  sheetFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#A1A1AA' },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F97316',
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Edit profile fields
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#71717A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldInput: { flex: 1, fontSize: 15, color: '#F5F5F5' },

  // Backup options
  backupSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#52525B',
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  backupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  backupIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backupOptionText: { flex: 1 },
  backupOptionTitle: { fontSize: 14, fontWeight: '600', color: '#F5F5F5', marginBottom: 2 },
  backupOptionSubtitle: { fontSize: 12, color: '#71717A' },
});
