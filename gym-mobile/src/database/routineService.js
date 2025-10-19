// src/database/routineService.js

import { getDatabase } from './db';
import { v4 as uuidv4 } from 'react-native-uuid';

export const routineService = {
  // Crear rutina
  create: async (clienteId, routineData) => {
    const db = getDatabase();
    const id = uuidv4();
    
    try {
      await db.runAsync(
        `INSERT INTO rutinas (
          id, clienteId, nombre, descripcion, 
          tipo, nivel, duracionEstimada
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          clienteId,
          routineData.nombre,
          routineData.descripcion || null,
          routineData.tipo || 'personalizado',
          routineData.nivel || 'principiante',
          routineData.duracionEstimada || 60
        ]
      );

      // Agregar días
      if (routineData.diasSemana && routineData.diasSemana.length > 0) {
        for (const dia of routineData.diasSemana) {
          await db.runAsync(
            'INSERT INTO rutina_dias (rutinaId, dia) VALUES (?, ?)',
            [id, dia]
          );
        }
      }

      // Agregar ejercicios
      if (routineData.ejercicios && routineData.ejercicios.length > 0) {
        for (const ej of routineData.ejercicios) {
          await db.runAsync(
            `INSERT INTO ejercicios (
              rutinaId, nombre, series, repeticiones, 
              peso, grupoMuscular, orden
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              ej.nombre,
              ej.series || 3,
              ej.repeticiones || '10-12',
              ej.peso || 'A definir',
              ej.grupoMuscular,
              ej.orden || 0
            ]
          );
        }
      }

      console.log(`✅ Rutina creada: ${routineData.nombre}`);
      return { ...routineData, id, clienteId };
    } catch (error) {
      console.error('❌ Error creando rutina:', error);
      throw error;
    }
  },

  // Obtener rutinas de un cliente
  getByCliente: async (clienteId) => {
    const db = getDatabase();
    try {
      const rutinas = await db.getAllAsync(
        'SELECT * FROM rutinas WHERE clienteId = ? AND activa = 1',
        [clienteId]
      );

      // Agregar días y ejercicios a cada rutina
      for (const rutina of rutinas) {
        const dias = await db.getAllAsync(
          'SELECT dia FROM rutina_dias WHERE rutinaId = ?',
          [rutina.id]
        );
        rutina.diasSemana = dias.map(d => d.dia);

        const ejercicios = await db.getAllAsync(
          'SELECT * FROM ejercicios WHERE rutinaId = ? ORDER BY orden',
          [rutina.id]
        );
        rutina.ejercicios = ejercicios;
      }

      return rutinas;
    } catch (error) {
      console.error('❌ Error obteniendo rutinas:', error);
      throw error;
    }
  },

  // Obtener rutina por ID
  getById: async (id) => {
    const db = getDatabase();
    try {
      const rutina = await db.getFirstAsync(
        'SELECT * FROM rutinas WHERE id = ?',
        [id]
      );

      if (!rutina) return null;

      const dias = await db.getAllAsync(
        'SELECT dia FROM rutina_dias WHERE rutinaId = ?',
        [id]
      );
      rutina.diasSemana = dias.map(d => d.dia);

      const ejercicios = await db.getAllAsync(
        'SELECT * FROM ejercicios WHERE rutinaId = ? ORDER BY orden',
        [id]
      );
      rutina.ejercicios = ejercicios;

      return rutina;
    } catch (error) {
      console.error('❌ Error obteniendo rutina:', error);
      throw error;
    }
  },

  // Obtener todas las rutinas
  getAll: async () => {
    const db = getDatabase();
    try {
      const rutinas = await db.getAllAsync(
        'SELECT * FROM rutinas WHERE activa = 1'
      );

      for (const rutina of rutinas) {
        const dias = await db.getAllAsync(
          'SELECT dia FROM rutina_dias WHERE rutinaId = ?',
          [rutina.id]
        );
        rutina.diasSemana = dias.map(d => d.dia);

        const ejercicios = await db.getAllAsync(
          'SELECT * FROM ejercicios WHERE rutinaId = ? ORDER BY orden',
          [rutina.id]
        );
        rutina.ejercicios = ejercicios;
      }

      return rutinas;
    } catch (error) {
      console.error('❌ Error obteniendo rutinas:', error);
      throw error;
    }
  },

  // Eliminar rutina
  delete: async (id) => {
    const db = getDatabase();
    try {
      await db.runAsync(
        'UPDATE rutinas SET activa = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      console.log(`✅ Rutina eliminada: ${id}`);
    } catch (error) {
      console.error('❌ Error eliminando rutina:', error);
      throw error;
    }
  }
};