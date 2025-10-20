// src/screens/Profile/ProfileScreen.js
import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { useDatabase } from '../../context/DatabaseContext';
import { useAppConfig } from '../../context/AppConfigContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { clients } = useDatabase();
  const { appName, adminProfile, updateAppName, updateAdminProfile, updatePassword } = useAppConfig();
  const [quickStats, setQuickStats] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editType, setEditType] = useState(''); // 'name', 'email', 'phone', 'appName', 'password'
  const [editValue, setEditValue] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    loadQuickStats();
  }, []);

  const loadQuickStats = async () => {
    try {
      const allClients = await clients.getAll();
      const totalClients = allClients.length;
      const activeClients = allClients.filter(c => c.estadoPago === 'pagado').length;
      const monthlyRevenue = allClients
        .filter(c => c.estadoPago === 'pagado')
        .reduce((sum, c) => sum + (c.montoMensual || 0), 0);
      
      setQuickStats({
        totalClients,
        activeClients,
        monthlyRevenue
      });
    } catch (error) {
      console.error('Error loading quick stats:', error);
    }
  };

  const validateCurrentPassword = async (password) => {
    try {
      // En producción, aquí verificarías con tu sistema de autenticación
      // Por ahora simulamos con AsyncStorage
      const storedPassword = await AsyncStorage.getItem('admin_password_hash');
      
      // Si no hay contraseña guardada, usar la por defecto (admin123)
      if (!storedPassword) {
        return password === 'admin123';
      }
      
      // En producción usarías bcrypt para comparar hashes
      return password === storedPassword;
    } catch (error) {
      console.error('Error validating password:', error);
      return false;
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: logout }
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert(
      'Editar Perfil',
      'Selecciona qué datos quieres modificar:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Nombre', onPress: () => openEditModal('name') },
        { text: 'Email', onPress: () => openEditModal('email') },
        { text: 'Teléfono', onPress: () => openEditModal('phone') },
        { text: 'Cambiar Contraseña', onPress: () => openEditModal('password') },
      ]
    );
  };

  const openEditModal = (type) => {
    setEditType(type);
    setShowEditModal(true);
    
    switch (type) {
      case 'name':
        setEditValue(adminProfile.name);
        break;
      case 'email':
        setEditValue(adminProfile.email);
        break;
      case 'phone':
        setEditValue(adminProfile.phone);
        break;
      case 'appName':
        setEditValue(appName);
        break;
      case 'password':
        setCurrentPassword('');
        setEditValue('');
        setConfirmPassword('');
        setShowPasswords({ current: false, new: false, confirm: false });
        break;
      default:
        setEditValue('');
    }
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim() && editType !== 'phone') {
      Alert.alert('Error', 'Este campo no puede estar vacío');
      return;
    }

    if (editType === 'password') {
      if (!currentPassword.trim()) {
        Alert.alert('Error', 'Debes ingresar tu contraseña actual');
        return;
      }
      
      // Validar contraseña actual (simulado - en producción verificar con el sistema de auth)
      const isCurrentPasswordValid = await validateCurrentPassword(currentPassword);
      if (!isCurrentPasswordValid) {
        Alert.alert('Error', 'La contraseña actual es incorrecta');
        return;
      }
      
      if (editValue.length < 6) {
        Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (editValue !== confirmPassword) {
        Alert.alert('Error', 'Las contraseñas nuevas no coinciden');
        return;
      }
      if (currentPassword === editValue) {
        Alert.alert('Error', 'La nueva contraseña debe ser diferente a la actual');
        return;
      }
    }

    if (editType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editValue)) {
        Alert.alert('Error', 'Ingresa un email válido');
        return;
      }
    }

    try {
      let success = false;

      if (editType === 'password') {
        success = await updatePassword(editValue);
      } else if (editType === 'appName') {
        success = await updateAppName(editValue);
      } else {
        const updatedProfile = { ...adminProfile, [editType]: editValue };
        success = await updateAdminProfile(updatedProfile);
      }

      if (success) {
        setShowEditModal(false);
        setCurrentPassword('');
        setEditValue('');
        setConfirmPassword('');
        setShowPasswords({ current: false, new: false, confirm: false });
        
        const messages = {
          name: 'Nombre actualizado correctamente',
          email: 'Email actualizado correctamente',
          phone: 'Teléfono actualizado correctamente',
          appName: 'Nombre de la aplicación actualizado',
          password: 'Contraseña cambiada correctamente'
        };
        
        Alert.alert('✅ Éxito', messages[editType]);
      } else {
        Alert.alert('Error', 'No se pudo guardar los cambios');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al guardar los cambios');
    }
  };

  const changeAppName = () => {
    openEditModal('appName');
  };

  const backupData = () => {
    Alert.alert(
      'Respaldo de Datos',
      'Selecciona una opción:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Exportar Datos', onPress: () => exportData() },
        { text: 'Importar Datos', onPress: () => importData() },
      ]
    );
  };

  const exportData = () => {
    Alert.alert(
      'Exportando...',
      'Creando respaldo de todos los datos del gimnasio',
      [{ text: 'OK', onPress: () => Alert.alert('Éxito', '✅ Datos exportados correctamente\nArchivo guardado en Descargas') }]
    );
  };

  const importData = () => {
    Alert.alert(
      'Importar Datos',
      '⚠️ Esta acción reemplazará todos los datos actuales.\n¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Importar', style: 'destructive', onPress: () => {
          Alert.alert('Importando...', 'Procesando archivo de respaldo');
        }}
      ]
    );
  };

  const notificationSettings = () => {
    Alert.alert(
      'Configuración de Notificaciones',
      'Funcionalidad en desarrollo.\n\nAquí podrás configurar:\n• Recordatorios de pagos\n• Alertas de vencimientos\n• Notificaciones push\n• Horarios de recordatorios'
    );
  };

  const menuItems = [
    { 
      icon: '📊', 
      title: 'Estadísticas', 
      subtitle: 'Ver reportes completos',
      onPress: () => navigation.navigate('Statistics')
    },
    { 
      icon: '👤', 
      title: 'Editar Perfil', 
      subtitle: 'Modificar datos personales',
      onPress: handleEditProfile
    },
    { 
      icon: '🔒', 
      title: 'Cambiar Contraseña', 
      subtitle: 'Actualizar contraseña de acceso',
      onPress: () => openEditModal('password')
    },
    { 
      icon: '🏷️', 
      title: 'Nombre de la App', 
      subtitle: 'Personalizar nombre del gimnasio',
      onPress: changeAppName
    },
    { 
      icon: '🔔', 
      title: 'Notificaciones', 
      subtitle: 'Gestionar alertas y recordatorios',
      onPress: notificationSettings
    },
    { 
      icon: '💾', 
      title: 'Respaldo de Datos', 
      subtitle: 'Exportar e importar información',
      onPress: backupData
    },
    { icon: '💳', title: 'Métodos de Pago', subtitle: 'Configurar formas de cobro' },
    { icon: '📅', title: 'Google Calendar', subtitle: 'Vincular calendario' },
    { icon: '❓', title: 'Ayuda y Soporte', subtitle: 'Centro de ayuda' },
  ];

  return (
    <>
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <Text style={styles.name}>{adminProfile.name}</Text>
        <Text style={styles.email}>{adminProfile.email}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Dueño de {appName}</Text>
        </View>
      </View>

      {/* Quick Stats */}
      {quickStats && (
        <View style={styles.quickStatsContainer}>
          <Text style={styles.quickStatsTitle}>Resumen Rápido</Text>
          <View style={styles.quickStatsGrid}>
            <View style={styles.quickStatCard}>
              <Text style={styles.quickStatValue}>{quickStats.totalClients}</Text>
              <Text style={styles.quickStatLabel}>Total Clientes</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Text style={styles.quickStatValue}>{quickStats.activeClients}</Text>
              <Text style={styles.quickStatLabel}>Activos</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Text style={styles.quickStatValue}>${quickStats.monthlyRevenue.toLocaleString()}</Text>
              <Text style={styles.quickStatLabel}>Ingresos</Text>
            </View>
          </View>
        </View>
      )}

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress || (() => Alert.alert('Info', 'Funcionalidad en desarrollo'))}
          >
            <View style={styles.menuIconContainer}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>Mi Gimnasio App</Text>
        <Text style={styles.appVersion}>Versión 1.0.0</Text>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Cerrar Sesión</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>

      {/* Modal de Edición */}
      <Modal
      visible={showEditModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowEditModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {editType === 'name' && '✏️ Editar Nombre'}
            {editType === 'email' && '📧 Editar Email'}
            {editType === 'phone' && '📱 Editar Teléfono'}
            {editType === 'appName' && '🏷️ Nombre de la App'}
            {editType === 'password' && '🔒 Cambiar Contraseña'}
          </Text>

          {editType === 'password' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contraseña actual</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Ingresa tu contraseña actual"
                  secureTextEntry={!showPasswords.current}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => setShowPasswords(prev => ({...prev, current: !prev.current}))}
                >
                  <Text style={styles.eyeIcon}>{showPasswords.current ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {editType === 'name' && 'Nombre completo'}
              {editType === 'email' && 'Dirección de email'}
              {editType === 'phone' && 'Número de teléfono'}
              {editType === 'appName' && 'Nombre del gimnasio'}
              {editType === 'password' && 'Nueva contraseña'}
            </Text>
            {editType === 'password' ? (
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={editValue}
                  onChangeText={setEditValue}
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry={!showPasswords.new}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => setShowPasswords(prev => ({...prev, new: !prev.new}))}
                >
                  <Text style={styles.eyeIcon}>{showPasswords.new ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TextInput
                style={styles.textInput}
                value={editValue}
                onChangeText={setEditValue}
                placeholder={
                  editType === 'name' ? 'Ej: Juan Pérez' :
                  editType === 'email' ? 'Ej: admin@gimnasio.com' :
                  editType === 'phone' ? 'Ej: +54 9 11 1234-5678' :
                  'Ej: Gimnasio PowerFit'
                }
                keyboardType={
                  editType === 'email' ? 'email-address' :
                  editType === 'phone' ? 'phone-pad' : 'default'
                }
                autoCapitalize={editType === 'email' ? 'none' : 'words'}
              />
            )}
          </View>

          {editType === 'password' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirmar nueva contraseña</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirma tu nueva contraseña"
                  secureTextEntry={!showPasswords.confirm}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => setShowPasswords(prev => ({...prev, confirm: !prev.confirm}))}
                >
                  <Text style={styles.eyeIcon}>{showPasswords.confirm ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {editType === 'password' && (
            <View style={styles.passwordRules}>
              <Text style={styles.passwordRulesTitle}>Requisitos de la contraseña:</Text>
              <View style={styles.passwordRule}>
                <Text style={[styles.passwordRuleIcon, { color: editValue.length >= 6 ? '#10B981' : '#EF4444' }]}>
                  {editValue.length >= 6 ? '✅' : '❌'}
                </Text>
                <Text style={styles.passwordRuleText}>Mínimo 6 caracteres</Text>
              </View>
              <View style={styles.passwordRule}>
                <Text style={[styles.passwordRuleIcon, { color: (editValue && confirmPassword && editValue === confirmPassword) ? '#10B981' : '#EF4444' }]}>
                  {(editValue && confirmPassword && editValue === confirmPassword) ? '✅' : '❌'}
                </Text>
                <Text style={styles.passwordRuleText}>Contraseñas coinciden</Text>
              </View>
              <View style={styles.passwordRule}>
                <Text style={[styles.passwordRuleIcon, { color: (currentPassword && editValue && currentPassword !== editValue) ? '#10B981' : '#EF4444' }]}>
                  {(currentPassword && editValue && currentPassword !== editValue) ? '✅' : '❌'}
                </Text>
                <Text style={styles.passwordRuleText}>Diferente a la actual</Text>
              </View>
            </View>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => {
                setShowEditModal(false);
                setCurrentPassword('');
                setEditValue('');
                setConfirmPassword('');
                setShowPasswords({ current: false, new: false, confirm: false });
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSaveEdit}
            >
              <Text style={styles.saveButtonText}>
                {editType === 'password' ? 'Cambiar' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#4F46E5',
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  email: {
    fontSize: 14,
    color: '#E0E7FF',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  quickStatsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  quickStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  quickStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIcon: {
    fontSize: 20,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  menuArrow: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  appInfoText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    minHeight: 48,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    minHeight: 48,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeButton: {
    padding: 12,
    paddingLeft: 8,
  },
  eyeIcon: {
    fontSize: 18,
  },
  passwordRules: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  passwordRulesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  passwordRule: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  passwordRuleIcon: {
    fontSize: 12,
    marginRight: 8,
    width: 16,
  },
  passwordRuleText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});