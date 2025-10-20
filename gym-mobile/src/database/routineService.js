// src/database/routineService.js

import { getDatabase } from './db';

// Función simple para generar ID único
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

export const routineService = {
  // Crear rutina o plantilla
  create: async (clienteId, routineData) => {
    const db = getDatabase();
    const id = generateId();
    
    try {
      // Validaciones básicas
      if (!routineData.nombre) {
        throw new Error('El nombre de la rutina es requerido');
      }
      
      if (!routineData.diasSemana || routineData.diasSemana.length === 0) {
        throw new Error('Debe seleccionar al menos un día de entrenamiento');
      }

      await db.runAsync(
        `INSERT INTO rutinas (
          id, clienteId, nombre, descripcion, 
          tipo, nivel, duracionEstimada
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          clienteId || null, // Permitir null para plantillas
          routineData.nombre.trim(),
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
              rutinaId, nombre, descripcion, series, repeticiones, 
              peso, descanso, grupoMuscular, videoUrl, notas, orden
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              ej.nombre || 'Sin nombre',
              ej.descripcion || null,
              ej.series || 3,
              ej.repeticiones || '10-12',
              ej.peso || 'A definir',
              ej.descanso || '60 seg',
              ej.grupoMuscular || 'general',
              ej.videoUrl || null,
              ej.notas || null,
              ej.orden || 0
            ]
          );
        }
      }

      const tipo = clienteId ? 'rutina' : 'plantilla';
      console.log(`✅ ${tipo} creada: ${routineData.nombre} (ID: ${id})`);
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
        'SELECT * FROM rutinas WHERE clienteId = ? AND activa = 1 ORDER BY createdAt DESC',
        [clienteId]
      );

      for (const rutina of rutinas) {
        const dias = await db.getAllAsync(
          'SELECT dia FROM rutina_dias WHERE rutinaId = ? ORDER BY dia',
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
      const rutina = await db.getFirstAsync(`
        SELECT 
          r.*,
          c.nombre as clienteNombre,
          c.apellido as clienteApellido,
          c.email as clienteEmail,
          c.telefono as clienteTelefono,
          c.id as clienteDbId
        FROM rutinas r
        LEFT JOIN clientes c ON r.clienteId = c.id
        WHERE r.id = ?
      `, [id]);

      if (!rutina) return null;

      // Agregar objeto cliente si existe información de cliente
      if (rutina.clienteNombre) {
        rutina.cliente = {
          id: rutina.clienteDbId,
          nombre: rutina.clienteNombre,
          apellido: rutina.clienteApellido,
          email: rutina.clienteEmail,
          telefono: rutina.clienteTelefono
        };
      }

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
      const rutinas = await db.getAllAsync(`
        SELECT 
          r.*,
          c.nombre as clienteNombre,
          c.apellido as clienteApellido,
          c.email as clienteEmail,
          c.telefono as clienteTelefono,
          c.id as clienteDbId
        FROM rutinas r
        LEFT JOIN clientes c ON r.clienteId = c.id
        WHERE r.activa = 1 
        ORDER BY r.createdAt DESC
      `);

      for (const rutina of rutinas) {
        // Agregar objeto cliente si existe información de cliente
        if (rutina.clienteNombre) {
          rutina.cliente = {
            id: rutina.clienteDbId,
            nombre: rutina.clienteNombre,
            apellido: rutina.clienteApellido,
            email: rutina.clienteEmail,
            telefono: rutina.clienteTelefono
          };
        }

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

  // Obtener rutinas agrupadas por nombre (solo rutinas con clientes, no plantillas)
  getGrouped: async () => {
    const db = getDatabase();
    try {
      // Solo obtener rutinas que tienen clientes asignados (no plantillas)
      const rutinas = await db.getAllAsync(
        'SELECT DISTINCT nombre FROM rutinas WHERE activa = 1 AND clienteId IS NOT NULL ORDER BY nombre'
      );

      const groups = [];

      for (const r of rutinas) {
        const rutinasDelGrupo = await db.getAllAsync(
          'SELECT * FROM rutinas WHERE nombre = ? AND activa = 1 AND clienteId IS NOT NULL',
          [r.nombre]
        );

        let totalClientes = 0;
        const clientes = [];
        let templateData = null;

        for (const rutina of rutinasDelGrupo) {
          // Solo contar clientes si la rutina tiene clienteId
          if (rutina.clienteId) {
            totalClientes++;
            const cliente = await db.getFirstAsync(
              'SELECT id, nombre, apellido, email FROM clientes WHERE id = ?',
              [rutina.clienteId]
            );
            if (cliente) clientes.push(cliente);
          }

          // Usar la primera rutina como plantilla para obtener estructura
          if (!templateData) {
            const dias = await db.getAllAsync(
              'SELECT dia FROM rutina_dias WHERE rutinaId = ?',
              [rutina.id]
            );
            const ejercicios = await db.getAllAsync(
              'SELECT * FROM ejercicios WHERE rutinaId = ? ORDER BY orden',
              [rutina.id]
            );
            templateData = {
              ...rutina,
              diasSemana: dias.map(d => d.dia),
              ejercicios
            };
          }
        }

        // Solo agregar grupos que realmente tienen clientes
        if (totalClientes > 0) {
          groups.push({
            _id: r.nombre,
            routineId: templateData?.id,
            nombre: r.nombre,
            tipo: templateData?.tipo,
            nivel: templateData?.nivel,
            diasSemana: templateData?.diasSemana || [],
            duracionEstimada: templateData?.duracionEstimada,
            ejercicios: templateData?.ejercicios || [],
            clientes,
            cantidad: totalClientes,
            createdAt: templateData?.createdAt
          });
        }
      }

      return groups;
    } catch (error) {
      console.error('❌ Error obteniendo grupos:', error);
      throw error;
    }
  },

  // Actualizar rutina
  update: async (id, routineData) => {
    const db = getDatabase();
    try {
      await db.runAsync(
        `UPDATE rutinas SET 
          nombre = ?, descripcion = ?, tipo = ?, nivel = ?,
          duracionEstimada = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          routineData.nombre,
          routineData.descripcion,
          routineData.tipo,
          routineData.nivel,
          routineData.duracionEstimada,
          id
        ]
      );

      // Actualizar días si se proporcionan
      if (routineData.diasSemana) {
        await db.runAsync('DELETE FROM rutina_dias WHERE rutinaId = ?', [id]);
        for (const dia of routineData.diasSemana) {
          await db.runAsync(
            'INSERT INTO rutina_dias (rutinaId, dia) VALUES (?, ?)',
            [id, dia]
          );
        }
      }

      console.log(`✅ Rutina actualizada`);
    } catch (error) {
      console.error('❌ Error actualizando rutina:', error);
      throw error;
    }
  },

  // Eliminar rutina (soft delete)
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
  },

  // Agregar cliente a grupo
  addClientToGroup: async (baseRoutineId, clienteId) => {
    const db = getDatabase();
    const id = generateId();

    try {
      const baseRoutine = await db.getFirstAsync(
        'SELECT * FROM rutinas WHERE id = ?',
        [baseRoutineId]
      );

      if (!baseRoutine) throw new Error('Rutina base no encontrada');

      await db.runAsync(
        `INSERT INTO rutinas (
          id, clienteId, nombre, descripcion, tipo, nivel, duracionEstimada
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          clienteId,
          baseRoutine.nombre,
          baseRoutine.descripcion,
          baseRoutine.tipo,
          baseRoutine.nivel,
          baseRoutine.duracionEstimada
        ]
      );

      // Copiar días
      const dias = await db.getAllAsync(
        'SELECT dia FROM rutina_dias WHERE rutinaId = ?',
        [baseRoutineId]
      );

      for (const d of dias) {
        await db.runAsync(
          'INSERT INTO rutina_dias (rutinaId, dia) VALUES (?, ?)',
          [id, d.dia]
        );
      }

      // Copiar ejercicios
      const ejercicios = await db.getAllAsync(
        'SELECT * FROM ejercicios WHERE rutinaId = ?',
        [baseRoutineId]
      );

      for (const ej of ejercicios) {
        await db.runAsync(
          `INSERT INTO ejercicios (
            rutinaId, nombre, descripcion, series, repeticiones,
            peso, descanso, grupoMuscular, videoUrl, notas, orden
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id, ej.nombre, ej.descripcion, ej.series, ej.repeticiones,
            ej.peso, ej.descanso, ej.grupoMuscular, ej.videoUrl, ej.notas, ej.orden
          ]
        );
      }

      console.log(`✅ Cliente agregado al grupo`);
      return { id, clienteId };
    } catch (error) {
      console.error('❌ Error agregando cliente:', error);
      throw error;
    }
  }
};