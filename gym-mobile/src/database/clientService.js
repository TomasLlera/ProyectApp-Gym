// src/database/clientService.js

import { getDatabase } from './db';
import { v4 as uuidv4 } from 'react-native-uuid';

export const clientService = {
  // Crear cliente
  create: async (clientData) => {
    const db = getDatabase();
    const id = uuidv4();
    
    try {
      await db.runAsync(
        `INSERT INTO clientes (
          id, nombre, apellido, email, documento, 
          telefono, tipoPlan, montoMensual, estadoPago
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          clientData.nombre,
          clientData.apellido,
          clientData.email,
          clientData.documento,
          clientData.telefono || null,
          clientData.tipoPlan || 'mensual',
          clientData.montoMensual,
          'pendiente'
        ]
      );
      
      console.log(`✅ Cliente creado: ${clientData.nombre}`);
      return { ...clientData, id };
    } catch (error) {
      console.error('❌ Error creando cliente:', error);
      throw error;
    }
  },

  // Obtener todos los clientes
  getAll: async () => {
    const db = getDatabase();
    try {
      const clientes = await db.getAllAsync('SELECT * FROM clientes WHERE activo = 1');
      return clientes;
    } catch (error) {
      console.error('❌ Error obteniendo clientes:', error);
      throw error;
    }
  },

  // Obtener cliente por ID
  getById: async (id) => {
    const db = getDatabase();
    try {
      const cliente = await db.getFirstAsync(
        'SELECT * FROM clientes WHERE id = ?',
        [id]
      );
      return cliente;
    } catch (error) {
      console.error('❌ Error obteniendo cliente:', error);
      throw error;
    }
  },

  // Actualizar cliente
  update: async (id, clientData) => {
    const db = getDatabase();
    try {
      await db.runAsync(
        `UPDATE clientes SET 
          nombre = ?, apellido = ?, email = ?, 
          documento = ?, telefono = ?, 
          tipoPlan = ?, montoMensual = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          clientData.nombre,
          clientData.apellido,
          clientData.email,
          clientData.documento,
          clientData.telefono,
          clientData.tipoPlan,
          clientData.montoMensual,
          id
        ]
      );
      console.log(`✅ Cliente actualizado: ${clientData.nombre}`);
    } catch (error) {
      console.error('❌ Error actualizando cliente:', error);
      throw error;
    }
  },

  // Eliminar cliente (soft delete)
  delete: async (id) => {
    const db = getDatabase();
    try {
      await db.runAsync(
        'UPDATE clientes SET activo = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      console.log(`✅ Cliente eliminado: ${id}`);
    } catch (error) {
      console.error('❌ Error eliminando cliente:', error);
      throw error;
    }
  },

  // Actualizar estado de pago
  updatePaymentStatus: async (id, estadoPago) => {
    const db = getDatabase();
    try {
      await db.runAsync(
        `UPDATE clientes SET 
          estadoPago = ?, 
          fechaUltimoPago = CURRENT_TIMESTAMP,
          updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?`,
        [estadoPago, id]
      );
      console.log(`✅ Estado de pago actualizado: ${estadoPago}`);
    } catch (error) {
      console.error('❌ Error actualizando pago:', error);
      throw error;
    }
  }
};