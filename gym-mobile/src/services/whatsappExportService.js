// src/services/whatsappExportService.js

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Linking } from 'react-native';

class WhatsAppExportService {
  /**
   * 📤 Exportar clientes a formato VCF (vCard) para WhatsApp
   */
  async exportClientsToVCF(clientes) {
    try {
      console.log(`📤 Exportando ${clientes.length} clientes a VCF...`);
      
      if (clientes.length === 0) {
        Alert.alert('Error', 'No hay clientes para exportar');
        return null;
      }

      // Crear contenido VCF
      let vcfContent = '';
      
      clientes.forEach((cliente, index) => {
        const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`;
        const telefono = cliente.telefono || '';
        const email = cliente.email || '';
        
        // Solo exportar si tiene teléfono
        if (telefono) {
          vcfContent += this.createVCard(
            nombreCompleto,
            telefono,
            email,
            cliente.tipoPlan
          );
        }
      });

      if (!vcfContent) {
        Alert.alert('Error', 'Ningún cliente tiene teléfono registrado');
        return null;
      }

      // Crear archivo VCF
      const fileName = `O2Gym_Clientes_${this.formatDate(new Date())}.vcf`;
      const file = new File(Paths.document, fileName);
      
      await file.create();
      await file.write(vcfContent);
      
      console.log('✅ Archivo VCF creado:', file.uri);
      
      // Compartir archivo
      const canShare = await Sharing.isAvailableAsync();
      
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/vcard',
          dialogTitle: 'Exportar Contactos a WhatsApp',
          UTI: 'public.vcard',
        });
        
        // Mostrar instrucciones
        setTimeout(() => {
          Alert.alert(
            '📱 Instrucciones',
            '1. Guarda el archivo VCF\n' +
            '2. Abre WhatsApp\n' +
            '3. Ve a Configuración → Contactos\n' +
            '4. Importa los contactos desde el archivo\n\n' +
            '✅ Tus clientes estarán en WhatsApp'
          );
        }, 1000);
        
        return { success: true, fileName, totalExportados: clientes.length };
      } else {
        Alert.alert(
          'Archivo Creado',
          `📄 ${fileName}\n\n` +
          `📍 Ubicación:\n${file.uri}\n\n` +
          `💡 Abre este archivo con WhatsApp para importar los contactos.`
        );
        return { success: true, fileName, fileUri: file.uri };
      }
      
    } catch (error) {
      console.error('❌ Error exportando a VCF:', error);
      throw new Error(`Error al exportar: ${error.message}`);
    }
  }

  /**
   * 📇 Crear una vCard individual
   */
  createVCard(nombre, telefono, email, organizacion) {
    // Limpiar teléfono para formato internacional
    let tel = telefono.replace(/[^0-9+]/g, '');
    if (!tel.startsWith('+')) {
      tel = '+54' + tel.replace(/^0/, '');
    }

    let vcard = 'BEGIN:VCARD\n';
    vcard += 'VERSION:3.0\n';
    vcard += `FN:${nombre}\n`;
    vcard += `TEL;TYPE=CELL:${tel}\n`;
    
    if (email && !email.includes('@temp.com')) {
      vcard += `EMAIL:${email}\n`;
    }
    
    if (organizacion) {
      vcard += `ORG:O2 Gym - ${organizacion}\n`;
    } else {
      vcard += 'ORG:O2 Gym\n';
    }
    
    vcard += 'END:VCARD\n';
    
    return vcard;
  }

  /**
   * 📱 Crear lista de difusión en WhatsApp (abrir selector)
   */
  /**
 * 📤 Crear lista de difusión con WhatsApp
 */
async crearListaDifusion(clientes, rutinaInfo) {
  try {
    console.log(`📱 Creando lista de difusión para ${clientes.length} clientes...`);
    
    if (clientes.length === 0) {
      Alert.alert('Error', 'No hay clientes seleccionados');
      return;
    }

    // Filtrar clientes con teléfono
    const clientesConTelefono = clientes.filter(c => c.telefono);
    
    if (clientesConTelefono.length === 0) {
      Alert.alert('Error', 'Ningún cliente tiene teléfono registrado');
      return;
    }

    // Normalizar números
    const numeros = clientesConTelefono.map(c => {
      let tel = c.telefono.replace(/[^0-9+]/g, '');
      if (!tel.startsWith('+54')) {
        tel = '+54' + tel.replace(/^0/, '');
      }
      return tel.replace('+', '');
    });

    // ✅ Ahora sí agregamos la rutina al mensaje
    const mensaje = this.crearMensajeDifusion(clientesConTelefono, rutinaInfo);

    Alert.alert(
      '📱 Lista de Difusión',
      `Se abrirá WhatsApp con ${clientesConTelefono.length} contacto(s).\n\n` +
      `📝 Pasos:\n` +
      `1. Se copiará el mensaje\n` +
      `2. En WhatsApp: Crearás una nueva difusión\n` +
      `3. Seleccionarás estos contactos:\n\n` +
      clientesConTelefono.map(c => `• ${c.nombre} ${c.apellido}`).join('\n').substring(0, 200) +
      (clientesConTelefono.length > 5 ? '\n...' : ''),
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Abrir WhatsApp', 
          onPress: () => this.abrirWhatsAppParaDifusion(mensaje)
        }
      ]
    );

  } catch (error) {
    console.error('❌ Error creando lista de difusión:', error);
    Alert.alert('Error', 'No se pudo crear la lista de difusión');
  }
}

/**
 * 📝 Crear mensaje personalizado para difusión con info de la rutina
 */
crearMensajeDifusion(clientes, rutinaInfo = null) {
  let mensaje = '🏋️ *O2 Gym*\n\n';

  if (rutinaInfo) {
    mensaje += `📋 *Nueva Rutina Asignada*\n\n`;
    mensaje += `🔸 Rutina: *${rutinaInfo.nombre}*\n`;
    mensaje += `🔸 Tipo: ${rutinaInfo.tipo}\n`;
    mensaje += `🔸 Nivel: ${rutinaInfo.nivel}\n`;
    mensaje += `🔸 Duración: ${rutinaInfo.duracionEstimada} min\n`;
    mensaje += `🔸 Días: ${rutinaInfo.diasSemana.join(', ')}\n\n`;

    if (rutinaInfo.ejercicios && rutinaInfo.ejercicios.length > 0) {
      mensaje += `💪 *Ejercicios (${rutinaInfo.ejercicios.length}):*\n\n`;
      rutinaInfo.ejercicios.forEach((ej, index) => {
        mensaje += `${index + 1}. *${ej.nombre}*\n`;
        mensaje += `   • ${ej.series}x${ej.repeticiones} – ${ej.peso}\n`;
        mensaje += `   • Descanso: ${ej.descanso}\n\n`;
      });
    }

    mensaje += `📍 ¡Nos vemos en el gimnasio!\n`;
    mensaje += `🔥 ¡Vamos por esos objetivos!`;

  } else {
    mensaje += `Hola! 👋\n\n`;
    mensaje += `Les recordamos que el gimnasio está abierto.\n\n`;
    mensaje += `¡Los esperamos! 💪`;
  }

  return mensaje;
}


  /**
   * 📲 Abrir WhatsApp con mensaje predefinido
   */
  async abrirWhatsAppParaDifusion(mensaje) {
    try {
      const mensajeCodificado = encodeURIComponent(mensaje);
      
      // Abrir WhatsApp Web o app
      const whatsappUrl = `whatsapp://send?text=${mensajeCodificado}`;
      
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert(
          'WhatsApp no disponible',
          'Instala WhatsApp para usar esta función'
        );
      }
    } catch (error) {
      console.error('Error abriendo WhatsApp:', error);
      Alert.alert('Error', 'No se pudo abrir WhatsApp');
    }
  }

  /**
   * 📱 Enviar mensaje individual por WhatsApp
   */
  async enviarMensajeIndividual(telefono, mensaje) {
    try {
      let tel = telefono.replace(/[^0-9+]/g, '');
      if (!tel.startsWith('+54')) {
        tel = '+54' + tel.replace(/^0/, '');
      }
      
      const numeroLimpio = tel.replace('+', '');
      const mensajeCodificado = encodeURIComponent(mensaje);
      
      const whatsappUrl = `https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`;
      
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('Error', 'No se pudo abrir WhatsApp');
      }
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    }
  }

  /**
   * 📅 Formatear fecha para nombres de archivo
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}`;
  }
}

export default new WhatsAppExportService();