// src/database/routineService.js

import { getDatabase } from './db';

// Función simple para generar ID único
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// ========================================
// FUNCIONES DE VALIDACIÓN
// ========================================

// Validar datos de rutina
const validateRoutineData = (routineData) => {
  const errors = [];

  // Nombre obligatorio
  if (!routineData.nombre?.trim()) {
    errors.push('El nombre de la rutina es obligatorio');
  } else if (routineData.nombre.trim().length < 3) {
    errors.push('El nombre debe tener al menos 3 caracteres');
  }

  // Al menos un día
  if (!routineData.diasSemana || routineData.diasSemana.length === 0) {
    errors.push('Debe seleccionar al menos un día de entrenamiento');
  }

  // Validar días válidos
  const diasValidos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  if (routineData.diasSemana) {
    const diasInvalidos = routineData.diasSemana.filter(d => !diasValidos.includes(d));
    if (diasInvalidos.length > 0) {
      errors.push(`Días inválidos: ${diasInvalidos.join(', ')}`);
    }
  }

  // Duración válida
  if (routineData.duracionEstimada) {
    const duracion = parseInt(routineData.duracionEstimada);
    if (isNaN(duracion) || duracion < 10 || duracion > 300) {
      errors.push('La duración debe estar entre 10 y 300 minutos');
    }
  }

  // Al menos un ejercicio
  if (!routineData.ejercicios || routineData.ejercicios.length === 0) {
    errors.push('Debe agregar al menos un ejercicio');
  }

  // Validar ejercicios
  if (routineData.ejercicios && Array.isArray(routineData.ejercicios)) {
    routineData.ejercicios.forEach((ej, index) => {
      if (!ej.nombre?.trim()) {
        errors.push(`Ejercicio ${index + 1}: el nombre es obligatorio`);
      }
      if (!ej.series || ej.series < 1) {
        errors.push(`Ejercicio ${index + 1}: debe tener al menos 1 serie`);
      }
      if (!ej.repeticiones?.trim()) {
        errors.push(`Ejercicio ${index + 1}: las repeticiones son obligatorias`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validar que no exista rutina duplicada
const validateUniqueName = async (clienteId, nombre, excludeId = null) => {
  const db = await getDatabase();
  let query = 'SELECT id FROM rutinas WHERE clienteId = ? AND LOWER(nombre) = LOWER(?) AND activa = 1';
  const params = [clienteId, nombre.trim()];

  if (excludeId) {
    query += ' AND id != ?';
    params.push(excludeId);
  }

  try {
    const existing = await db.getFirstAsync(query, params);
    return !existing;
  } catch (error) {
    console.error('Error validando nombre de rutina:', error);
    return false;
  }
};

export const routineService = {
  // Crear rutina o plantilla
  create: async (clienteId, routineData) => {
    const db = await getDatabase();
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
    const db = await getDatabase();
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
    const db = await getDatabase();
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
    const db = await getDatabase();
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
    const db = await getDatabase();
    try {
      console.log('📊 Obteniendo grupos de rutinas...');

      // Solo obtener rutinas que tienen clientes asignados (no plantillas)
      const rutinas = await db.getAllAsync(
        'SELECT DISTINCT nombre FROM rutinas WHERE activa = 1 AND clienteId IS NOT NULL ORDER BY nombre'
      );

      console.log(`✅ Encontrados ${rutinas.length} grupos únicos`);
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

            // 🔥 CRÍTICO: Traer TODOS los datos del cliente, incluyendo teléfono
            const cliente = await db.getFirstAsync(
              'SELECT id, nombre, apellido, email, telefono, documento FROM clientes WHERE id = ?',
              [rutina.clienteId]
            );

            if (cliente) {
              console.log(`✅ Cliente: ${cliente.nombre} - Tel: ${cliente.telefono || 'SIN TEL'}`);
              clientes.push(cliente);
            } else {
              console.warn(`⚠️ Cliente ${rutina.clienteId} no encontrado`);
            }
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
          const conTelefono = clientes.filter(c => c.telefono).length;
          console.log(`📞 Grupo "${r.nombre}": ${conTelefono}/${totalClientes} con teléfono`);

          groups.push({
            _id: r.nombre,
            id: r.nombre,
            routineId: templateData?.id,
            nombre: r.nombre,
            tipo: templateData?.tipo,
            nivel: templateData?.nivel,
            diasSemana: templateData?.diasSemana || [],
            duracionEstimada: templateData?.duracionEstimada,
            ejercicios: templateData?.ejercicios || [],
            clientes, // Array completo con teléfonos
            cantidad: totalClientes,
            createdAt: templateData?.createdAt
          });
        }
      }

      console.log(`✅ Retornando ${groups.length} grupos con clientes`);
      return groups;
    } catch (error) {
      console.error('❌ Error obteniendo grupos:', error);
      throw error;
    }
  },

  // Actualizar rutina
  update: async (id, routineData) => {
    const db = await getDatabase();
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
    const db = await getDatabase();
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
    const db = await getDatabase();
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
  },

  // ========================================
  // FUNCIONES DE VALIDACIÓN PÚBLICAS
  // ========================================
  validateRoutineData,
  validateUniqueName
};