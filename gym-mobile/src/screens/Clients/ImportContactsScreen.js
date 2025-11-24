// src/screens/Clients/ImportContactsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { useDatabase } from '../../context/DatabaseContext';

export default function ImportContactsScreen({ navigation }) {
  const { clients } = useDatabase();
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [existingClientsPhones, setExistingClientsPhones] = useState(new Set());

  useEffect(() => {
    loadContacts();
    loadExistingClients();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [searchTerm, contacts]);

  // ============================================
  // 📋 CARGAR CLIENTES EXISTENTES PARA DETECTAR DUPLICADOS
  // ============================================
  const loadExistingClients = async () => {
    try {
      const existingClients = await clients.getAll();
      const phones = new Set(
        existingClients
          .filter(c => c.activo === 1 && c.telefono)
          .map(c => c.telefono.replace(/[^0-9+]/g, ''))
      );
      setExistingClientsPhones(phones);
    } catch (error) {
      console.error('Error cargando clientes existentes:', error);
    }
  };

  // ============================================
  // 📱 CARGAR CONTACTOS DEL TELÉFONO
  // ============================================
  const loadContacts = async () => {
    try {
      console.log('📱 Solicitando permisos...');
      
      // Solicitar permisos
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permisos Requeridos',
          'Necesitamos acceso a tus contactos para importarlos',
          [
            { text: 'Cancelar', onPress: () => navigation.goBack() },
            { text: 'Reintentar', onPress: () => loadContacts() }
          ]
        );
        setLoading(false);
        return;
      }

      console.log('✅ Permisos otorgados, cargando contactos...');

      // Obtener contactos
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
      });

      console.log(`📊 ${data.length} contactos encontrados`);

      // Filtrar contactos válidos
      const validContacts = data
        .filter(contact => {
          const hasName = contact.name || contact.firstName || contact.lastName;
          const hasPhone = contact.phoneNumbers && contact.phoneNumbers.length > 0;
          return hasName && hasPhone;
        })
        .map(contact => {
          const firstName = contact.firstName || contact.name?.split(' ')[0] || 'Cliente';
          const lastName = contact.lastName || contact.name?.split(' ').slice(1).join(' ') || 'Importado';
          
          return {
            id: contact.id,
            name: contact.name || `${firstName} ${lastName}`.trim(),
            firstName: firstName,
            lastName: lastName,
            phoneNumber: contact.phoneNumbers[0]?.number || '',
            email: contact.emails && contact.emails.length > 0 
              ? contact.emails[0].email 
              : generateEmailFromName(firstName, lastName),
            hasRealEmail: !!(contact.emails && contact.emails.length > 0),
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      console.log(`✅ ${validContacts.length} contactos válidos procesados`);
      
      // Recargar clientes existentes para detectar duplicados
      await loadExistingClients();
      
      setContacts(validContacts);
      setFilteredContacts(validContacts);
    } catch (error) {
      console.error('❌ Error cargando contactos:', error);
      Alert.alert('Error', 'No se pudieron cargar los contactos del teléfono');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // 🔄 RECARGAR CONTACTOS
  // ============================================
  const reloadContacts = async () => {
    setLoading(true);
    setSelectedContacts([]);
    await loadContacts();
  };

  // ============================================
  // 📧 GENERAR EMAIL TEMPORAL
  // ============================================
  const generateEmailFromName = (firstName, lastName) => {
    const cleanFirst = firstName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    
    const cleanLast = lastName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    
    return `${cleanFirst}.${cleanLast}@temp.com`;
  };

  // ============================================
  // 🔍 FILTRAR CONTACTOS
  // ============================================
  const filterContacts = () => {
    if (!searchTerm.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = contacts.filter(contact =>
      contact.name.toLowerCase().includes(term) ||
      contact.firstName.toLowerCase().includes(term) ||
      contact.lastName.toLowerCase().includes(term) ||
      contact.phoneNumber.includes(searchTerm) ||
      (contact.email && contact.email.toLowerCase().includes(term))
    );

    setFilteredContacts(filtered);
  };

  // ============================================
  // ✅ VERIFICAR SI CONTACTO YA EXISTE
  // ============================================
  const isContactDuplicate = (phoneNumber) => {
    if (!phoneNumber) return false;
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    let normalizedPhone = cleanPhone;
    
    // Normalizar formato de teléfono
    if (!normalizedPhone.startsWith('+54')) {
      normalizedPhone = normalizedPhone.replace(/^0/, '');
      normalizedPhone = '+54' + normalizedPhone;
    }
    
    return existingClientsPhones.has(normalizedPhone) || 
           existingClientsPhones.has(cleanPhone);
  };

  // ============================================
  // ✅ SELECCIONAR/DESELECCIONAR
  // ============================================
  const toggleContact = (contactId) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(selectedContacts.filter(id => id !== contactId));
    } else {
      setSelectedContacts([...selectedContacts, contactId]);
    }
  };

  const selectAll = () => {
    const allIds = filteredContacts.map(c => c.id);
    setSelectedContacts(allIds);
  };

  const deselectAll = () => {
    setSelectedContacts([]);
  };

  // ============================================
  // 📥 IMPORTAR CONTACTOS
  // ============================================
  const importSelectedContacts = async () => {
    if (selectedContacts.length === 0) {
      Alert.alert('Error', 'Selecciona al menos un contacto');
      return;
    }

    Alert.alert(
      '📥 Importar Contactos',
      `¿Importar ${selectedContacts.length} contacto(s)?\n\n` +
      `✅ Se validarán automáticamente:\n` +
      `• Duplicados (mismo teléfono)\n` +
      `• Emails temporales para contactos sin email\n` +
      `• DNI temporal único\n` +
      `• Monto mensual predeterminado: $3500`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: '✅ Importar', onPress: () => performImport() }
      ]
    );
  };

  // ============================================
  // 🚀 REALIZAR IMPORTACIÓN
  // ============================================
  const performImport = async () => {
    setImporting(true);
    
    try {
      const selectedContactsData = contacts.filter(c => 
        selectedContacts.includes(c.id)
      );

      let imported = 0;
      let duplicates = 0;
      let errors = 0;
      const errorDetails = [];

      for (const contact of selectedContactsData) {
        try {
          // Formatear teléfono
          let phone = contact.phoneNumber.replace(/[^0-9+]/g, '');
          
          // Agregar código de país si no lo tiene
          if (!phone.startsWith('+54')) {
            phone = phone.replace(/^0/, '');
            phone = '+54' + phone;
          }

          // Validar duplicados por teléfono (ya verificado en UI, pero doble verificación)
          const existingClients = await clients.getAll();
          const phoneExists = existingClients.some(c => {
            const existingPhone = c.telefono?.replace(/[^0-9+]/g, '') || '';
            return (existingPhone === phone || existingPhone === phone.replace('+54', '')) && c.activo === 1;
          });

          if (phoneExists) {
            console.log(`⚠️ Teléfono duplicado: ${contact.name}`);
            duplicates++;
            continue;
          }

          // Generar DNI temporal único
          const tempDNI = await generateUniqueDNI();

          // Crear cliente
          await clients.create({
            nombre: contact.firstName.trim(),
            apellido: contact.lastName.trim(),
            email: contact.email,
            documento: tempDNI,
            telefono: phone,
            tipoPlan: 'mensual',
            montoMensual: 3500,
          });

          imported++;
          console.log(`✅ Importado: ${contact.name}`);

        } catch (error) {
          console.error(`❌ Error importando ${contact.name}:`, error);
          errors++;
          errorDetails.push({
            nombre: contact.name,
            error: error.message
          });
        }
      }

      // Mostrar resultado
      let message = `✅ ${imported} contacto(s) importado(s)`;
      
      if (duplicates > 0) {
        message += `\n⚠️ ${duplicates} duplicado(s) omitido(s)`;
      }
      
      if (errors > 0) {
        message += `\n❌ ${errors} error(es)`;
        
        // Mostrar detalles de errores
        if (errorDetails.length > 0 && errorDetails.length <= 3) {
          message += `\n\nErrores:\n`;
          errorDetails.forEach(e => {
            message += `• ${e.nombre}: ${e.error}\n`;
          });
        }
      }

      Alert.alert('Importación Completada', message, [
        { 
          text: 'OK', 
          onPress: () => {
            if (imported > 0) {
              navigation.goBack();
            }
          }
        }
      ]);

    } catch (error) {
      console.error('❌ Error en importación:', error);
      Alert.alert('Error', 'No se pudieron importar los contactos');
    } finally {
      setImporting(false);
    }
  };

  // ============================================
  // 🔢 GENERAR DNI TEMPORAL ÚNICO
  // ============================================
  const generateUniqueDNI = async () => {
    const existingClients = await clients.getAll();
    let tempDNI;
    let isUnique = false;
    
    // Generar DNI entre 10000000-19999999 (rango temporal)
    while (!isUnique) {
      tempDNI = Math.floor(10000000 + Math.random() * 9999999).toString();
      isUnique = !existingClients.some(c => c.documento === tempDNI);
    }
    
    return tempDNI;
  };

  // ============================================
  // 🎨 RENDER
  // ============================================
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Cargando contactos...</Text>
        <Text style={styles.loadingSubtext}>Esto puede tomar unos segundos</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Volver</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>📱 Importar Contactos</Text>
          <TouchableOpacity 
            style={styles.reloadButton}
            onPress={reloadContacts}
            disabled={loading}
          >
            <Text style={styles.reloadButtonText}>🔄 Recargar</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          {selectedContacts.length} de {filteredContacts.length} seleccionado(s)
        </Text>
      </View>

      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar contacto..."
          placeholderTextColor="#9CA3AF"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Botones de Selección */}
      <View style={styles.selectionButtons}>
        <TouchableOpacity style={styles.selectionButton} onPress={selectAll}>
          <Text style={styles.selectionButtonText}>✅ Todos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectionButton} onPress={deselectAll}>
          <Text style={styles.selectionButtonText}>❌ Ninguno</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Contactos */}
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedContacts.includes(item.id);
          const isDuplicate = isContactDuplicate(item.phoneNumber);
          return (
            <TouchableOpacity
              style={[
                styles.contactItem, 
                isSelected && styles.contactItemSelected,
                isDuplicate && styles.contactItemDuplicate
              ]}
              onPress={() => {
                if (!isDuplicate) {
                  toggleContact(item.id);
                } else {
                  Alert.alert(
                    'Contacto ya existe',
                    'Este contacto ya está registrado como cliente en el sistema.',
                    [{ text: 'OK' }]
                  );
                }
              }}
              activeOpacity={0.7}
              disabled={isDuplicate}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.contactInfo}>
                <View style={styles.contactNameRow}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  {isDuplicate && (
                    <View style={styles.duplicateBadge}>
                      <Text style={styles.duplicateBadgeText}>✓ Ya existe</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.contactPhone}>📱 {item.phoneNumber}</Text>
                {!item.hasRealEmail && (
                  <Text style={styles.tempEmailWarning}>
                    ⚠️ Email temporal: {item.email}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>No se encontraron contactos</Text>
            <Text style={styles.emptySubtext}>
              {searchTerm ? 'Intenta con otra búsqueda' : 'No hay contactos en tu teléfono'}
            </Text>
          </View>
        }
      />

      {/* Botón Importar */}
      {selectedContacts.length > 0 && (
        <View style={styles.importButtonContainer}>
          <TouchableOpacity
            style={[styles.importButton, importing && styles.importButtonDisabled]}
            onPress={importSelectedContacts}
            disabled={importing}
          >
            <Text style={styles.importButtonText}>
              {importing 
                ? '⏳ Importando...' 
                : `📥 Importar ${selectedContacts.length} Contacto(s)`
              }
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
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
  headerTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  reloadButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E55A2B',
  },
  reloadButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FF8456',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  searchIcon: { fontSize: 20, marginRight: 8 },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1A1A1A',
  },
  selectionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  selectionButton: {
    flex: 1,
    backgroundColor: '#FFF5F2',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  selectionButtonText: {
    color: '#E55A2B',
    fontSize: 13,
    fontWeight: 'bold',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  contactItemSelected: {
    backgroundColor: '#FFF5F2',
    borderColor: '#FF6B35',
  },
  contactItemDuplicate: {
    opacity: 0.6,
    backgroundColor: '#F3F4F6',
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  duplicateBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  duplicateBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FF6B35',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactInfo: { flex: 1 },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  tempEmailWarning: {
    fontSize: 12,
    color: '#F59E0B',
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#1A1A1A',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  importButtonContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  importButton: {
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E55A2B',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  importButtonDisabled: { opacity: 0.6 },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});