// src/database/syncService.js

import { getDatabase } from './db';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_TIMESTAMP_KEY = 'last_sync_timestamp';
const API_URL = 'http://192.168.0.83:3000/api';

/**
 * Sincronizar datos desde MongoDB a SQLite
 * Se ejecuta cuando se abre la app por primera vez
 */
export const syncFromMongoDB = async (token) => {
  const db = await getDatabase();
  
  try {
    console.log('\n🔄 Iniciando sincronización desde MongoDB...\n');
    
    // 1. Descargar clientes
    await syncClientes(db, token);
    
    // 2. Descargar rutinas
    await syncRutinas(db, token);
    
    // 3. Descargar pagos
    await syncPagos(db, token);
    
    // Guardar timestamp de última sincronización
    const now = new Date().toISOString();
    await AsyncStorage.setItem(SYNC_TIMESTAMP_KEY, now);
    
    console.log('✅ Sincronización completada exitosamente\n');
    return true;
  } catch (error) {
    console.error('❌ Error en sincronización:', error.message);
    throw error;
  }
};

/**
 * Sincronizar clientes desde MongoDB
 */
const syncClientes = async (db, token) => {
  try {
    console.log('📥 Descargando clientes...');
    
    const response = await fetch(`${API_URL}/clients?limit=1000`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const clientes = data.data.clients;

    console.log(`   Encontrados: ${clientes.length} clientes`);

    for (const cliente of clientes) {
      await db.runAsync(
        `INSERT OR REPLACE INTO clientes (
          id, nombre, apellido, email, documento, 
          telefono, tipoPlan, montoMensual, 
          fechaVencimiento, estadoPago, fechaUltimoPago,
          fechaRegistro, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cliente._id,
          cliente.nombre,
          cliente.apellido,
          cliente.email,
          cliente.documento,
          cliente.telefono || null,
          cliente.tipoPlan || 'mensual',
          cliente.montoMensual,
          cliente.fechaVencimiento || null,
          cliente.estadoPago || 'pendiente',
          cliente.fechaUltimoPago || null,
          cliente.fechaRegistro,
          cliente.activo ? 1 : 0
        ]
      );
    }

    console.log(`   ✅ ${clientes.length} clientes sincronizados\n`);
  } catch (error) {
    console.error('❌ Error sincronizando clientes:', error.message);
    throw error;
  }
};

/**
 * Sincronizar rutinas desde MongoDB
 */
const syncRutinas = async (db, token) => {
  try {
    console.log('📥 Descargando rutinas...');
    
    const response = await fetch(`${API_URL}/routines?limit=1000`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const rutinas = data.data.routines;

    console.log(`   Encontradas: ${rutinas.length} rutinas`);

    for (const rutina of rutinas) {
      // Insertar rutina
      await db.runAsync(
        `INSERT OR REPLACE INTO rutinas (
          id, clienteId, nombre, descripcion, 
          tipo, nivel, duracionEstimada, activa,
          fechaInicio, notas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rutina._id,
          rutina.cliente?._id || rutina.cliente,
          rutina.nombre,
          rutina.descripcion || null,
          rutina.tipo || 'personalizado',
          rutina.nivel || 'principiante',
          rutina.duracionEstimada || 60,
          rutina.activa ? 1 : 0,
          rutina.fechaInicio,
          rutina.notas || null
        ]
      );

      // Insertar días de la semana
      if (rutina.diasSemana && rutina.diasSemana.length > 0) {
        for (const dia of rutina.diasSemana) {
          await db.runAsync(
            `INSERT OR IGNORE INTO rutina_dias (rutinaId, dia) 
             VALUES (?, ?)`,
            [rutina._id, dia]
          );
        }
      }

      // Insertar ejercicios
      if (rutina.ejercicios && rutina.ejercicios.length > 0) {
        for (const ej of rutina.ejercicios) {
          await db.runAsync(
            `INSERT OR REPLACE INTO ejercicios (
              rutinaId, nombre, descripcion, series, 
              repeticiones, peso, descanso, 
              grupoMuscular, videoUrl, notas, orden
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              rutina._id,
              ej.nombre,
              ej.descripcion || null,
              ej.series || 3,
              ej.repeticiones || '10-12',
              ej.peso || 'A definir',
              ej.descanso || '60 seg',
              ej.grupoMuscular,
              ej.videoUrl || null,
              ej.notas || null,
              ej.orden || 0
            ]
          );
        }
      }
    }

    console.log(`   ✅ ${rutinas.length} rutinas sincronizadas\n`);
  } catch (error) {
    console.error('❌ Error sincronizando rutinas:', error.message);
    throw error;
  }
};

/**
 * Sincronizar pagos desde MongoDB
 */
const syncPagos = async (db, token) => {
  try {
    console.log('📥 Descargando pagos...');
    
    const response = await fetch(`${API_URL}/payments?limit=1000`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const pagos = data.data.payments;

    console.log(`   Encontrados: ${pagos.length} pagos`);

    for (const pago of pagos) {
      await db.runAsync(
        `INSERT OR REPLACE INTO pagos (
          id, clienteId, monto, fecha, 
          metodoPago, estado, notas, mes, año
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pago._id,
          pago.cliente?._id || pago.cliente,
          pago.monto,
          pago.fecha,
          pago.metodoPago || 'efectivo',
          pago.estado || 'confirmado',
          pago.notas || null,
          pago.mes,
          pago.año
        ]
      );
    }

    console.log(`   ✅ ${pagos.length} pagos sincronizados\n`);
  } catch (error) {
    console.error('❌ Error sincronizando pagos:', error.message);
    throw error;
  }
};

/**
 * Verificar si es necesario sincronizar
 */
export const shouldSync = async () => {
  try {
    const lastSync = await AsyncStorage.getItem(SYNC_TIMESTAMP_KEY);
    
    if (!lastSync) {
      console.log('📱 Primera vez: necesita sincronización completa');
      return true;
    }

    const lastSyncDate = new Date(lastSync);
    const now = new Date();
    const hoursDiff = (now - lastSyncDate) / (1000 * 60 * 60);

    // Sincronizar si pasaron más de 1 hora
    if (hoursDiff > 1) {
      console.log(`⏰ Última sincronización hace ${hoursDiff.toFixed(1)} horas`);
      return true;
    }

    console.log('✅ Datos actualizados recientemente, sin sincronizar');
    return false;
  } catch (error) {
    console.error('Error verificando sincronización:', error);
    return true; // Por seguridad, sincronizar si hay error
  }
};

/**
 * Forzar sincronización (manual)
 */
export const forceSyncFromMongoDB = async (token) => {
  try {
    console.log('\n🔄 Forzando sincronización...\n');
    await AsyncStorage.removeItem(SYNC_TIMESTAMP_KEY);
    await syncFromMongoDB(token);
    console.log('✅ Sincronización forzada completada\n');
    return true;
  } catch (error) {
    console.error('❌ Error en sincronización forzada:', error);
    throw error;
  }
};

/**
 * Obtener estado de sincronización
 */
export const getSyncStatus = async () => {
  try {
    const lastSync = await AsyncStorage.getItem(SYNC_TIMESTAMP_KEY);
    
    if (!lastSync) {
      return {
        synced: false,
        lastSync: null,
        message: 'Sin sincronización'
      };
    }

    const lastSyncDate = new Date(lastSync);
    const now = new Date();
    const hoursDiff = (now - lastSyncDate) / (1000 * 60 * 60);

    return {
      synced: true,
      lastSync: lastSyncDate.toLocaleString('es-AR'),
      hoursDiff: hoursDiff.toFixed(1),
      message: `Última sincronización hace ${hoursDiff.toFixed(1)} horas`
    };
  } catch (error) {
    console.error('Error obteniendo estado:', error);
    return { synced: false, error: error.message };
  }
};