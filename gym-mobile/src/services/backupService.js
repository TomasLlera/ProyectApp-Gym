// src/services/backupService.js

// ✅ NUEVA API de FileSystem
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform } from 'react-native';
import { getDatabase } from '../database/db';

class BackupService {
  /**
   * 📦 Exportar todos los datos a un archivo JSON
   */
  async exportData() {
    try {
      console.log('📦 Iniciando exportación completa...');
      const db = await getDatabase();
      
      // 1. Obtener todos los datos
      const clientes = await db.getAllAsync('SELECT * FROM clientes WHERE activo = 1');
      const rutinas = await db.getAllAsync('SELECT * FROM rutinas WHERE activa = 1');
      const pagos = await db.getAllAsync('SELECT * FROM pagos');
      const grupos = await db.getAllAsync('SELECT * FROM grupos WHERE activo = 1');
      
      console.log(`📊 Datos obtenidos: ${clientes.length} clientes, ${rutinas.length} rutinas`);
      
      // 2. Obtener datos relacionales de rutinas
      const rutinasCompletas = [];
      for (const rutina of rutinas) {
        const dias = await db.getAllAsync(
          'SELECT dia FROM rutina_dias WHERE rutinaId = ?',
          [rutina.id]
        );
        
        const ejercicios = await db.getAllAsync(
          'SELECT * FROM ejercicios WHERE rutinaId = ? ORDER BY orden',
          [rutina.id]
        );
        
        rutinasCompletas.push({
          ...rutina,
          diasSemana: dias.map(d => d.dia),
          ejercicios
        });
      }
      
      // 3. Obtener datos relacionales de grupos
      const gruposCompletos = [];
      for (const grupo of grupos) {
        const clientesGrupo = await db.getAllAsync(
          'SELECT clienteId FROM grupo_clientes WHERE grupoId = ?',
          [grupo.id]
        );
        
        gruposCompletos.push({
          ...grupo,
          clientes: clientesGrupo.map(c => c.clienteId)
        });
      }
      
      // 4. Crear objeto de backup
      const backup = {
        version: '1.0.0',
        appName: 'O2 Gym',
        exportDate: new Date().toISOString(),
        platform: Platform.OS,
        data: {
          clientes,
          rutinas: rutinasCompletas,
          pagos,
          grupos: gruposCompletos,
        },
        metadata: {
          totalClientes: clientes.length,
          totalRutinas: rutinasCompletas.length,
          totalPagos: pagos.length,
          totalGrupos: gruposCompletos.length,
        }
      };
      
      // 5. Convertir a JSON con formato legible
      const jsonData = JSON.stringify(backup, null, 2);
      
      // 6. Guardar usando la NUEVA API
      const fileName = `O2Gym_Backup_${this.formatDate(new Date())}.json`;
      const file = new File(Paths.document, fileName);
      
      await file.create();
      await file.write(jsonData);
      
      console.log('✅ Backup guardado en:', file.uri);
      
      // 7. Compartir archivo
      await this.shareFile(file.uri, fileName);
      
      return {
        success: true,
        fileName,
        fileUri: file.uri,
        metadata: backup.metadata,
      };
      
    } catch (error) {
      console.error('❌ Error exportando datos:', error);
      throw new Error(`Error al exportar: ${error.message}`);
    }
  }

  /**
   * 👥 Exportar solo clientes
   */
  async exportClientsOnly() {
    try {
      console.log('👥 Exportando solo clientes...');
      const db = await getDatabase();
      
      const clientes = await db.getAllAsync('SELECT * FROM clientes WHERE activo = 1');
      
      const backup = {
        version: '1.0.0',
        appName: 'O2 Gym',
        exportDate: new Date().toISOString(),
        dataType: 'clients_only',
        data: { clientes },
        metadata: { totalClientes: clientes.length }
      };
      
      const jsonData = JSON.stringify(backup, null, 2);
      const fileName = `O2Gym_Clientes_${this.formatDate(new Date())}.json`;
      
      // ✅ NUEVA API
      const file = new File(Paths.document, fileName);
      await file.create();
      await file.write(jsonData);
      
      await this.shareFile(file.uri, fileName);
      
      return { success: true, fileName, metadata: backup.metadata };
      
    } catch (error) {
      console.error('❌ Error exportando clientes:', error);
      throw new Error(`Error al exportar clientes: ${error.message}`);
    }
  }

  /**
   * 📊 Exportar a CSV (para Excel)
   */
  async exportToCSV() {
    try {
      console.log('📊 Exportando a CSV...');
      const db = await getDatabase();
      
      const clientes = await db.getAllAsync('SELECT * FROM clientes WHERE activo = 1');
      
      // Crear CSV con BOM para UTF-8 (para que Excel lo reconozca)
      let csv = '\uFEFF'; // BOM UTF-8
      csv += 'Nombre,Apellido,Email,DNI,Teléfono,Plan,Monto Mensual,Estado Pago,Fecha Registro\n';
      
      for (const cliente of clientes) {
        const fechaRegistro = cliente.fechaRegistro 
          ? new Date(cliente.fechaRegistro).toLocaleDateString('es-AR')
          : '';
        
        csv += `"${cliente.nombre}",` +
               `"${cliente.apellido}",` +
               `"${cliente.email}",` +
               `"${cliente.documento}",` +
               `"${cliente.telefono || ''}",` +
               `"${cliente.tipoPlan}",` +
               `"${cliente.montoMensual}",` +
               `"${cliente.estadoPago}",` +
               `"${fechaRegistro}"\n`;
      }
      
      const fileName = `O2Gym_Clientes_${this.formatDate(new Date())}.csv`;
      
      // ✅ NUEVA API
      const file = new File(Paths.document, fileName);
      await file.create();
      await file.write(csv);
      
      await this.shareFile(file.uri, fileName);
      
      return { success: true, fileName, totalClientes: clientes.length };
      
    } catch (error) {
      console.error('❌ Error exportando CSV:', error);
      throw new Error(`Error al exportar CSV: ${error.message}`);
    }
  }

  /**
   * 📥 Importar datos desde un archivo JSON
   */
  async importData() {
    try {
      console.log('📥 Iniciando importación...');
      
      // 1. Seleccionar archivo
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) {
        return { success: false, message: 'Importación cancelada' };
      }
      
      console.log('📄 Archivo seleccionado:', result.assets[0].name);
      
      // 2. Leer archivo con NUEVA API
      const file = new File(result.assets[0].uri);
      const fileContent = await file.text();
      const backup = JSON.parse(fileContent);
      
      // 3. Validar estructura del backup
      if (!this.validateBackup(backup)) {
        throw new Error('Archivo de backup inválido o corrupto');
      }
      
      console.log('✅ Backup válido:', backup.metadata);
      
      // 4. Confirmar importación
      return new Promise((resolve) => {
        Alert.alert(
          '⚠️ Confirmar Importación',
          `Backup del ${new Date(backup.exportDate).toLocaleString('es-AR')}\n\n` +
          `📊 Datos a importar:\n` +
          `• ${backup.metadata.totalClientes} clientes\n` +
          `• ${backup.metadata.totalRutinas} rutinas\n` +
          `• ${backup.metadata.totalPagos} pagos\n` +
          `• ${backup.metadata.totalGrupos} grupos\n\n` +
          `⚠️ Esto reemplazará los datos actuales.`,
          [
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => resolve({ success: false, message: 'Importación cancelada' }),
            },
            {
              text: 'Importar',
              style: 'destructive',
              onPress: async () => {
                try {
                  await this.performImport(backup);
                  resolve({ 
                    success: true, 
                    message: 'Datos importados correctamente',
                    metadata: backup.metadata 
                  });
                } catch (error) {
                  throw error;
                }
              },
            },
          ]
        );
      });
      
    } catch (error) {
      console.error('❌ Error importando:', error);
      throw new Error(`Error al importar: ${error.message}`);
    }
  }

  /**
   * 🔄 Realizar la importación real
   */
  async performImport(backup) {
    const db = await getDatabase();
    
    try {
      console.log('🔄 Limpiando datos existentes...');
      
      // 1. Marcar datos existentes como inactivos (soft delete)
      await db.runAsync('UPDATE clientes SET activo = 0 WHERE activo = 1');
      await db.runAsync('UPDATE rutinas SET activa = 0 WHERE activa = 1');
      await db.runAsync('UPDATE grupos SET activo = 0 WHERE activo = 1');
      await db.runAsync('DELETE FROM pagos');
      await db.runAsync('DELETE FROM rutina_dias');
      await db.runAsync('DELETE FROM ejercicios');
      await db.runAsync('DELETE FROM grupo_clientes');
      
      console.log('🗑️ Datos existentes limpiados');
      
      // 2. Importar clientes
      console.log('👥 Importando clientes...');
      for (const cliente of backup.data.clientes) {
        await db.runAsync(
          `INSERT OR REPLACE INTO clientes (
            id, nombre, apellido, email, documento, telefono,
            tipoPlan, montoMensual, fechaVencimiento, estadoPago,
            fechaUltimoPago, fechaRegistro, activo, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            cliente.id,
            cliente.nombre,
            cliente.apellido,
            cliente.email,
            cliente.documento,
            cliente.telefono,
            cliente.tipoPlan,
            cliente.montoMensual,
            cliente.fechaVencimiento,
            cliente.estadoPago,
            cliente.fechaUltimoPago,
            cliente.fechaRegistro,
            1, // activo
            cliente.createdAt,
            cliente.updatedAt || new Date().toISOString(),
          ]
        );
      }
      console.log(`✅ ${backup.data.clientes.length} clientes importados`);
      
      // 3. Importar rutinas
      console.log('🏋️ Importando rutinas...');
      for (const rutina of backup.data.rutinas) {
        // Insertar rutina
        await db.runAsync(
          `INSERT OR REPLACE INTO rutinas (
            id, clienteId, nombre, descripcion, tipo, nivel,
            duracionEstimada, activa, fechaInicio, notas, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            rutina.id,
            rutina.clienteId,
            rutina.nombre,
            rutina.descripcion,
            rutina.tipo,
            rutina.nivel,
            rutina.duracionEstimada,
            1, // activa
            rutina.fechaInicio,
            rutina.notas,
            rutina.createdAt,
            rutina.updatedAt || new Date().toISOString(),
          ]
        );
        
        // Insertar días
        if (rutina.diasSemana && rutina.diasSemana.length > 0) {
          for (const dia of rutina.diasSemana) {
            await db.runAsync(
              'INSERT INTO rutina_dias (rutinaId, dia) VALUES (?, ?)',
              [rutina.id, dia]
            );
          }
        }
        
        // Insertar ejercicios
        if (rutina.ejercicios && rutina.ejercicios.length > 0) {
          for (const ej of rutina.ejercicios) {
            await db.runAsync(
              `INSERT INTO ejercicios (
                rutinaId, nombre, descripcion, series, repeticiones,
                peso, descanso, grupoMuscular, videoUrl, notas, orden
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                rutina.id,
                ej.nombre,
                ej.descripcion,
                ej.series,
                ej.repeticiones,
                ej.peso,
                ej.descanso,
                ej.grupoMuscular,
                ej.videoUrl,
                ej.notas,
                ej.orden,
              ]
            );
          }
        }
      }
      console.log(`✅ ${backup.data.rutinas.length} rutinas importadas`);
      
      // 4. Importar pagos
      console.log('💰 Importando pagos...');
      for (const pago of backup.data.pagos) {
        await db.runAsync(
          `INSERT INTO pagos (
            id, clienteId, monto, fecha, metodoPago,
            estado, notas, mes, año, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pago.id,
            pago.clienteId,
            pago.monto,
            pago.fecha,
            pago.metodoPago,
            pago.estado,
            pago.notas,
            pago.mes,
            pago.año,
            pago.createdAt,
          ]
        );
      }
      console.log(`✅ ${backup.data.pagos.length} pagos importados`);
      
      // 5. Importar grupos
      console.log('👥 Importando grupos...');
      for (const grupo of backup.data.grupos) {
        await db.runAsync(
          `INSERT OR REPLACE INTO grupos (
            id, nombre, descripcion, activo, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            grupo.id,
            grupo.nombre,
            grupo.descripcion,
            1, // activo
            grupo.createdAt,
            grupo.updatedAt || new Date().toISOString(),
          ]
        );
        
        // Insertar clientes del grupo
        if (grupo.clientes && grupo.clientes.length > 0) {
          for (const clienteId of grupo.clientes) {
            await db.runAsync(
              'INSERT INTO grupo_clientes (grupoId, clienteId) VALUES (?, ?)',
              [grupo.id, clienteId]
            );
          }
        }
      }
      console.log(`✅ ${backup.data.grupos.length} grupos importados`);
      
      console.log('✅ Importación completada exitosamente');
      
    } catch (error) {
      console.error('❌ Error en performImport:', error);
      throw new Error(`Error importando datos: ${error.message}`);
    }
  }

  /**
   * ✅ Validar estructura del backup
   */
  validateBackup(backup) {
    if (!backup || typeof backup !== 'object') {
      console.error('Backup no es un objeto válido');
      return false;
    }
    if (!backup.version || !backup.data) {
      console.error('Falta version o data');
      return false;
    }
    if (!backup.data.clientes || !Array.isArray(backup.data.clientes)) {
      console.error('Falta clientes o no es array');
      return false;
    }
    if (!backup.metadata) {
      console.error('Falta metadata');
      return false;
    }
    
    console.log('✅ Backup válido');
    return true;
  }

  /**
   * 📤 Compartir archivo
   */
  async shareFile(fileUri, fileName) {
    try {
      const canShare = await Sharing.isAvailableAsync();
      
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: fileName.endsWith('.csv') ? 'text/csv' : 'application/json',
          dialogTitle: `Guardar ${fileName}`,
          UTI: fileName.endsWith('.csv') ? 'public.comma-separated-values-text' : 'public.json',
        });
      } else {
        Alert.alert(
          'Archivo Creado',
          `📄 ${fileName}\n\n` +
          `📁 Ubicación:\n${fileUri}\n\n` +
          `💡 Copia este archivo manualmente para guardarlo.`
        );
      }
    } catch (error) {
      console.error('Error compartiendo archivo:', error);
      // No lanzar error, el archivo ya fue creado
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

export default new BackupService();