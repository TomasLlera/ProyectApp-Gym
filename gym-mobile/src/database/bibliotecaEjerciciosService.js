// src/database/bibliotecaEjerciciosService.js

import { getDatabase } from './db';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

export const bibliotecaEjerciciosService = {
  // ============================================
  // 📚 CREAR EJERCICIO
  // ============================================
  create: async (ejercicioData) => {
    const db = await getDatabase();
    const id = generateId();
    
    try {
      if (!ejercicioData.nombre?.trim()) {
        throw new Error('El nombre del ejercicio es obligatorio');
      }
      
      if (!ejercicioData.grupoMuscular) {
        throw new Error('El grupo muscular es obligatorio');
      }
      
      await db.runAsync(
        `INSERT INTO biblioteca_ejercicios (
          id, nombre, descripcion, grupoMuscular, equipamiento,
          dificultad, videoUrl, imagenUrl, instrucciones,
          seriesSugeridas, repeticionesSugeridas, descansoSugerido, notas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          ejercicioData.nombre.trim(),
          ejercicioData.descripcion || null,
          ejercicioData.grupoMuscular,
          ejercicioData.equipamiento || null,
          ejercicioData.dificultad || 'intermedio',
          ejercicioData.videoUrl || null,
          ejercicioData.imagenUrl || null,
          ejercicioData.instrucciones || null,
          ejercicioData.seriesSugeridas || 3,
          ejercicioData.repeticionesSugeridas || '10-12',
          ejercicioData.descansoSugerido || '60 seg',
          ejercicioData.notas || null
        ]
      );
      
      console.log(`✅ Ejercicio creado: ${ejercicioData.nombre}`);
      return { ...ejercicioData, id };
    } catch (error) {
      console.error('❌ Error creando ejercicio:', error);
      throw error;
    }
  },

  // ============================================
  // 📖 OBTENER TODOS LOS EJERCICIOS
  // ============================================
  getAll: async (filtros = {}) => {
    const db = await getDatabase();
    try {
      let query = 'SELECT * FROM biblioteca_ejercicios WHERE activo = 1';
      const params = [];
      
      // Filtrar por grupo muscular
      if (filtros.grupoMuscular) {
        query += ' AND grupoMuscular = ?';
        params.push(filtros.grupoMuscular);
      }
      
      // Filtrar por dificultad
      if (filtros.dificultad) {
        query += ' AND dificultad = ?';
        params.push(filtros.dificultad);
      }
      
      // Filtrar favoritos
      if (filtros.soloFavoritos) {
        query += ' AND favorito = 1';
      }
      
      // Buscar por nombre
      if (filtros.busqueda) {
        query += ' AND LOWER(nombre) LIKE ?';
        params.push(`%${filtros.busqueda.toLowerCase()}%`);
      }
      
      // Ordenar
      if (filtros.ordenarPorUsos) {
        query += ' ORDER BY usosCount DESC, nombre ASC';
      } else if (filtros.ordenarPorFavoritos) {
        query += ' ORDER BY favorito DESC, nombre ASC';
      } else {
        query += ' ORDER BY nombre ASC';
      }
      
      const ejercicios = await db.getAllAsync(query, params);
      console.log(`✅ ${ejercicios.length} ejercicios encontrados`);
      return ejercicios;
    } catch (error) {
      console.error('❌ Error obteniendo ejercicios:', error);
      throw error;
    }
  },

  // ============================================
  // 🔍 OBTENER POR ID
  // ============================================
  getById: async (id) => {
    const db = await getDatabase();
    try {
      const ejercicio = await db.getFirstAsync(
        'SELECT * FROM biblioteca_ejercicios WHERE id = ?',
        [id]
      );
      return ejercicio;
    } catch (error) {
      console.error('❌ Error obteniendo ejercicio:', error);
      throw error;
    }
  },

  // ============================================
  // ✏️ ACTUALIZAR EJERCICIO
  // ============================================
  update: async (id, ejercicioData) => {
    const db = await getDatabase();
    try {
      await db.runAsync(
        `UPDATE biblioteca_ejercicios SET 
          nombre = ?, descripcion = ?, grupoMuscular = ?,
          equipamiento = ?, dificultad = ?, videoUrl = ?,
          imagenUrl = ?, instrucciones = ?,
          seriesSugeridas = ?, repeticionesSugeridas = ?,
          descansoSugerido = ?, notas = ?,
          updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          ejercicioData.nombre.trim(),
          ejercicioData.descripcion || null,
          ejercicioData.grupoMuscular,
          ejercicioData.equipamiento || null,
          ejercicioData.dificultad || 'intermedio',
          ejercicioData.videoUrl || null,
          ejercicioData.imagenUrl || null,
          ejercicioData.instrucciones || null,
          ejercicioData.seriesSugeridas || 3,
          ejercicioData.repeticionesSugeridas || '10-12',
          ejercicioData.descansoSugerido || '60 seg',
          ejercicioData.notas || null,
          id
        ]
      );
      console.log(`✅ Ejercicio actualizado: ${ejercicioData.nombre}`);
    } catch (error) {
      console.error('❌ Error actualizando ejercicio:', error);
      throw error;
    }
  },

  // ============================================
  // 🗑️ ELIMINAR EJERCICIO (soft delete)
  // ============================================
  delete: async (id) => {
    const db = await getDatabase();
    try {
      await db.runAsync(
        'UPDATE biblioteca_ejercicios SET activo = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      console.log(`✅ Ejercicio eliminado: ${id}`);
    } catch (error) {
      console.error('❌ Error eliminando ejercicio:', error);
      throw error;
    }
  },

  // ============================================
  // ⭐ TOGGLE FAVORITO
  // ============================================
  toggleFavorito: async (id) => {
    const db = await getDatabase();
    try {
      const ejercicio = await db.getFirstAsync(
        'SELECT favorito FROM biblioteca_ejercicios WHERE id = ?',
        [id]
      );
      
      const nuevoEstado = ejercicio.favorito === 1 ? 0 : 1;
      
      await db.runAsync(
        'UPDATE biblioteca_ejercicios SET favorito = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [nuevoEstado, id]
      );
      
      console.log(`✅ Favorito actualizado: ${nuevoEstado === 1 ? 'agregado' : 'removido'}`);
      return nuevoEstado;
    } catch (error) {
      console.error('❌ Error toggle favorito:', error);
      throw error;
    }
  },

  // ============================================
  // 📊 INCREMENTAR CONTADOR DE USOS
  // ============================================
  incrementarUsos: async (id) => {
    const db = await getDatabase();
    try {
      await db.runAsync(
        'UPDATE biblioteca_ejercicios SET usosCount = usosCount + 1 WHERE id = ?',
        [id]
      );
    } catch (error) {
      console.error('❌ Error incrementando usos:', error);
    }
  },

  // ============================================
  // 📊 OBTENER ESTADÍSTICAS
  // ============================================
  getEstadisticas: async () => {
    const db = await getDatabase();
    try {
      const total = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM biblioteca_ejercicios WHERE activo = 1'
      );
      
      const favoritos = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM biblioteca_ejercicios WHERE activo = 1 AND favorito = 1'
      );
      
      const porGrupo = await db.getAllAsync(`
        SELECT grupoMuscular, COUNT(*) as count 
        FROM biblioteca_ejercicios 
        WHERE activo = 1 
        GROUP BY grupoMuscular 
        ORDER BY count DESC
      `);
      
      const masUsados = await db.getAllAsync(`
        SELECT nombre, usosCount 
        FROM biblioteca_ejercicios 
        WHERE activo = 1 
        ORDER BY usosCount DESC 
        LIMIT 5
      `);
      
      return {
        total: total.count,
        favoritos: favoritos.count,
        porGrupo,
        masUsados
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  },

  // ============================================
  // 📤 EXPORTAR EJERCICIOS A JSON
  // ============================================
  exportar: async () => {
    const db = await getDatabase();
    try {
      const ejercicios = await db.getAllAsync(
        'SELECT * FROM biblioteca_ejercicios WHERE activo = 1 ORDER BY nombre'
      );
      
      const exportData = {
        version: '1.0',
        fecha: new Date().toISOString(),
        total: ejercicios.length,
        ejercicios: ejercicios.map(ej => ({
          nombre: ej.nombre,
          descripcion: ej.descripcion,
          grupoMuscular: ej.grupoMuscular,
          equipamiento: ej.equipamiento,
          dificultad: ej.dificultad,
          videoUrl: ej.videoUrl,
          imagenUrl: ej.imagenUrl,
          instrucciones: ej.instrucciones,
          seriesSugeridas: ej.seriesSugeridas,
          repeticionesSugeridas: ej.repeticionesSugeridas,
          descansoSugerido: ej.descansoSugerido,
          notas: ej.notas
        }))
      };
      
      const fileName = `BibliotecaEjercicios_${new Date().toISOString().split('T')[0]}.json`;
      const file = new File(Paths.document, fileName);
      
      await file.create();
      await file.write(JSON.stringify(exportData, null, 2));
      
      console.log('✅ Ejercicios exportados:', file.uri);
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Exportar Biblioteca de Ejercicios',
          UTI: 'public.json',
        });
      }
      
      return { success: true, fileName, total: ejercicios.length };
    } catch (error) {
      console.error('❌ Error exportando:', error);
      throw error;
    }
  },

  // ============================================
  // 📥 IMPORTAR EJERCICIOS DESDE JSON
  // ============================================
  importar: async (jsonData) => {
    const db = await getDatabase();
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      
      if (!data.ejercicios || !Array.isArray(data.ejercicios)) {
        throw new Error('Formato de archivo inválido');
      }
      
      let importados = 0;
      let duplicados = 0;
      
      for (const ej of data.ejercicios) {
        try {
          // Verificar si ya existe
          const existe = await db.getFirstAsync(
            'SELECT id FROM biblioteca_ejercicios WHERE LOWER(nombre) = LOWER(?) AND activo = 1',
            [ej.nombre]
          );
          
          if (existe) {
            duplicados++;
            continue;
          }
          
          // Crear ejercicio
          await bibliotecaEjerciciosService.create(ej);
          importados++;
        } catch (error) {
          console.warn(`⚠️ Error importando ${ej.nombre}:`, error);
        }
      }
      
      console.log(`✅ Importación completada: ${importados} nuevos, ${duplicados} duplicados`);
      return { importados, duplicados, total: data.ejercicios.length };
    } catch (error) {
      console.error('❌ Error importando:', error);
      throw error;
    }
  },

  // ============================================
  // 🏃 SEED EJERCICIOS DE CARDIO
  // ============================================
  seedCardioEjercicios: async () => {
    const db = await getDatabase();
    const ejerciciosCardio = [
      // ── LISS (baja intensidad, estado estacionario) ──
      { nombre: 'Trote en Cinta', grupoMuscular: 'cardio', equipamiento: 'Cinta de correr', dificultad: 'principiante', seriesSugeridas: 1, repeticionesSugeridas: '30 min', descansoSugerido: 'N/A', descripcion: 'Trote a ritmo constante y moderado. Ideal para quemar grasa y mejorar resistencia aeróbica.' },
      { nombre: 'Caminata Inclinada', grupoMuscular: 'cardio', equipamiento: 'Cinta de correr', dificultad: 'principiante', seriesSugeridas: 1, repeticionesSugeridas: '40 min', descansoSugerido: 'N/A', descripcion: 'Caminata en inclinación 10-12% para mayor quema calórica sin impacto articular.' },
      { nombre: 'Bicicleta Estática', grupoMuscular: 'cardio', equipamiento: 'Bicicleta estática', dificultad: 'principiante', seriesSugeridas: 1, repeticionesSugeridas: '45 min', descansoSugerido: 'N/A', descripcion: 'Pedaleo a ritmo constante de intensidad moderada. Bajo impacto.' },
      { nombre: 'Elíptica', grupoMuscular: 'cardio', equipamiento: 'Elíptica', dificultad: 'principiante', seriesSugeridas: 1, repeticionesSugeridas: '30 min', descansoSugerido: 'N/A', descripcion: 'Cardio completo de bajo impacto articular. Trabaja tren superior e inferior.' },
      { nombre: 'Remo Ergométrico', grupoMuscular: 'cardio', equipamiento: 'Remo ergométrico', dificultad: 'intermedio', seriesSugeridas: 1, repeticionesSugeridas: '20 min', descansoSugerido: 'N/A', descripcion: 'Trabaja tren superior, core y piernas simultáneamente. Alta demanda cardiovascular.' },
      { nombre: 'Escaladora', grupoMuscular: 'cardio', equipamiento: 'Escaladora', dificultad: 'intermedio', seriesSugeridas: 1, repeticionesSugeridas: '25 min', descansoSugerido: 'N/A', descripcion: 'Simula subir escaleras. Intensidad alta, trabaja glúteos y cuádriceps.' },
      // ── HIIT / Intervalos ──
      { nombre: 'HIIT en Cinta', grupoMuscular: 'cardio', equipamiento: 'Cinta de correr', dificultad: 'avanzado', seriesSugeridas: 8, repeticionesSugeridas: '30 seg', descansoSugerido: '90 seg', descripcion: 'Sprints al 90% máximo intercalados con trote suave. Efecto EPOC post-ejercicio.' },
      { nombre: 'Tabata', grupoMuscular: 'cardio', equipamiento: 'Sin equipo', dificultad: 'avanzado', seriesSugeridas: 8, repeticionesSugeridas: '20 seg', descansoSugerido: '10 seg', descripcion: 'Protocolo 20 seg trabajo / 10 seg descanso x8 rondas. 4 minutos totales de alta intensidad.' },
      { nombre: 'Intervalos en Bicicleta', grupoMuscular: 'cardio', equipamiento: 'Bicicleta estática', dificultad: 'intermedio', seriesSugeridas: 10, repeticionesSugeridas: '1 min', descansoSugerido: '1 min', descripcion: 'Sprints en bici alternando alta y baja resistencia. Mejora capacidad anaeróbica.' },
      // ── Cardio funcional / sin equipo ──
      { nombre: 'Salto a la Soga', grupoMuscular: 'cardio', equipamiento: 'Soga', dificultad: 'principiante', seriesSugeridas: 5, repeticionesSugeridas: '3 min', descansoSugerido: '60 seg', descripcion: 'Cardio de alto impacto. Mejora coordinación, ritmo y resistencia cardiovascular.' },
      { nombre: 'Burpees', grupoMuscular: 'cardio', equipamiento: 'Sin equipo', dificultad: 'avanzado', seriesSugeridas: 4, repeticionesSugeridas: '15 reps', descansoSugerido: '45 seg', descripcion: 'Ejercicio completo de cardio y fuerza. Eleva el ritmo cardíaco rápidamente.' },
      { nombre: 'Mountain Climbers', grupoMuscular: 'cardio', equipamiento: 'Sin equipo', dificultad: 'intermedio', seriesSugeridas: 4, repeticionesSugeridas: '30 seg', descansoSugerido: '30 seg', descripcion: 'Core y cardio en posición de plancha. Rodillas alternadas al pecho a máxima velocidad.' },
      { nombre: 'Jumping Jacks', grupoMuscular: 'cardio', equipamiento: 'Sin equipo', dificultad: 'principiante', seriesSugeridas: 3, repeticionesSugeridas: '1 min', descansoSugerido: '30 seg', descripcion: 'Cardio básico de calentamiento. Abre brazos y piernas simultáneamente.' },
      { nombre: 'Box Jumps', grupoMuscular: 'cardio', equipamiento: 'Cajón pliométrico', dificultad: 'avanzado', seriesSugeridas: 4, repeticionesSugeridas: '10 reps', descansoSugerido: '60 seg', descripcion: 'Saltos explosivos sobre cajón. Desarrolla potencia, fuerza y capacidad cardio.' },
      { nombre: 'Sentadilla con Salto', grupoMuscular: 'cardio', equipamiento: 'Sin equipo', dificultad: 'intermedio', seriesSugeridas: 3, repeticionesSugeridas: '15 reps', descansoSugerido: '45 seg', descripcion: 'Variante explosiva de la sentadilla. Combina fuerza de piernas y cardio.' },
    ];

    let creados = 0;
    for (const ej of ejerciciosCardio) {
      try {
        const existe = await db.getFirstAsync(
          'SELECT id FROM biblioteca_ejercicios WHERE LOWER(nombre) = LOWER(?) AND activo = 1',
          [ej.nombre]
        );
        if (existe) continue;
        await bibliotecaEjerciciosService.create(ej);
        creados++;
      } catch (error) {
        console.warn(`Error creando ${ej.nombre}:`, error);
      }
    }
    console.log(`✅ ${creados} ejercicios de cardio creados`);
    return creados;
  },

  // ============================================
  // 🎯 CREAR EJERCICIOS PREDETERMINADOS
  // ============================================
  crearEjerciciosPredeterminados: async () => {
    const ejerciciosPredeterminados = [
      // PECHO
      { nombre: 'Press de Banca', grupoMuscular: 'pecho', equipamiento: 'Barra', dificultad: 'intermedio', seriesSugeridas: 4, repeticionesSugeridas: '8-12' },
      { nombre: 'Press Inclinado con Mancuernas', grupoMuscular: 'pecho', equipamiento: 'Mancuernas', dificultad: 'intermedio', seriesSugeridas: 3, repeticionesSugeridas: '10-12' },
      { nombre: 'Aperturas con Mancuernas', grupoMuscular: 'pecho', equipamiento: 'Mancuernas', dificultad: 'principiante', seriesSugeridas: 3, repeticionesSugeridas: '12-15' },
      { nombre: 'Fondos en Paralelas', grupoMuscular: 'pecho', equipamiento: 'Peso corporal', dificultad: 'avanzado', seriesSugeridas: 3, repeticionesSugeridas: '8-12' },
      
      // ESPALDA
      { nombre: 'Dominadas', grupoMuscular: 'espalda', equipamiento: 'Peso corporal', dificultad: 'avanzado', seriesSugeridas: 4, repeticionesSugeridas: '6-10' },
      { nombre: 'Remo con Barra', grupoMuscular: 'espalda', equipamiento: 'Barra', dificultad: 'intermedio', seriesSugeridas: 4, repeticionesSugeridas: '8-12' },
      { nombre: 'Peso Muerto', grupoMuscular: 'espalda', equipamiento: 'Barra', dificultad: 'avanzado', seriesSugeridas: 3, repeticionesSugeridas: '5-8' },
      { nombre: 'Jalón al Pecho', grupoMuscular: 'espalda', equipamiento: 'Polea', dificultad: 'principiante', seriesSugeridas: 3, repeticionesSugeridas: '10-12' },
      
      // PIERNAS
      { nombre: 'Sentadillas', grupoMuscular: 'piernas', equipamiento: 'Barra', dificultad: 'intermedio', seriesSugeridas: 4, repeticionesSugeridas: '8-12' },
      { nombre: 'Prensa de Piernas', grupoMuscular: 'piernas', equipamiento: 'Máquina', dificultad: 'principiante', seriesSugeridas: 3, repeticionesSugeridas: '10-15' },
      { nombre: 'Zancadas', grupoMuscular: 'piernas', equipamiento: 'Mancuernas', dificultad: 'intermedio', seriesSugeridas: 3, repeticionesSugeridas: '10-12' },
      { nombre: 'Curl Femoral', grupoMuscular: 'piernas', equipamiento: 'Máquina', dificultad: 'principiante', seriesSugeridas: 3, repeticionesSugeridas: '12-15' },
      
      // HOMBROS
      { nombre: 'Press Militar', grupoMuscular: 'hombros', equipamiento: 'Barra', dificultad: 'intermedio', seriesSugeridas: 4, repeticionesSugeridas: '8-10' },
      { nombre: 'Elevaciones Laterales', grupoMuscular: 'hombros', equipamiento: 'Mancuernas', dificultad: 'principiante', seriesSugeridas: 3, repeticionesSugeridas: '12-15' },
      { nombre: 'Press Arnold', grupoMuscular: 'hombros', equipamiento: 'Mancuernas', dificultad: 'intermedio', seriesSugeridas: 3, repeticionesSugeridas: '10-12' },
      { nombre: 'Pájaros', grupoMuscular: 'hombros', equipamiento: 'Mancuernas', dificultad: 'principiante', seriesSugeridas: 3, repeticionesSugeridas: '12-15' },
      
      // BRAZOS
      { nombre: 'Curl con Barra', grupoMuscular: 'brazos', equipamiento: 'Barra', dificultad: 'principiante', seriesSugeridas: 3, repeticionesSugeridas: '10-12' },
      { nombre: 'Curl Martillo', grupoMuscular: 'brazos', equipamiento: 'Mancuernas', dificultad: 'principiante', seriesSugeridas: 3, repeticionesSugeridas: '10-12' },
      { nombre: 'Press Francés', grupoMuscular: 'brazos', equipamiento: 'Barra Z', dificultad: 'intermedio', seriesSugeridas: 3, repeticionesSugeridas: '10-12' },
      { nombre: 'Extensiones en Polea', grupoMuscular: 'brazos', equipamiento: 'Polea', dificultad: 'principiante', seriesSugeridas: 3, repeticionesSugeridas: '12-15' },
      
      // ABDOMINALES
      { nombre: 'Planchas', grupoMuscular: 'abdominales', equipamiento: 'Peso corporal', dificultad: 'principiante', seriesSugeridas: 3, repeticionesSugeridas: '30-60 seg' },
      { nombre: 'Crunches', grupoMuscular: 'abdominales', equipamiento: 'Peso corporal', dificultad: 'principiante', seriesSugeridas: 3, repeticionesSugeridas: '15-20' },
      { nombre: 'Elevaciones de Piernas', grupoMuscular: 'abdominales', equipamiento: 'Peso corporal', dificultad: 'intermedio', seriesSugeridas: 3, repeticionesSugeridas: '12-15' },
      { nombre: 'Russian Twists', grupoMuscular: 'abdominales', equipamiento: 'Peso corporal', dificultad: 'intermedio', seriesSugeridas: 3, repeticionesSugeridas: '20-30' },

      // CARDIO
      { nombre: 'Trote en Cinta', grupoMuscular: 'cardio', equipamiento: 'Cinta de correr', dificultad: 'principiante', seriesSugeridas: 1, repeticionesSugeridas: '30 min', descansoSugerido: 'N/A' },
      { nombre: 'Caminata Inclinada', grupoMuscular: 'cardio', equipamiento: 'Cinta de correr', dificultad: 'principiante', seriesSugeridas: 1, repeticionesSugeridas: '40 min', descansoSugerido: 'N/A' },
      { nombre: 'Bicicleta Estática', grupoMuscular: 'cardio', equipamiento: 'Bicicleta estática', dificultad: 'principiante', seriesSugeridas: 1, repeticionesSugeridas: '45 min', descansoSugerido: 'N/A' },
      { nombre: 'Elíptica', grupoMuscular: 'cardio', equipamiento: 'Elíptica', dificultad: 'principiante', seriesSugeridas: 1, repeticionesSugeridas: '30 min', descansoSugerido: 'N/A' },
      { nombre: 'Remo Ergométrico', grupoMuscular: 'cardio', equipamiento: 'Remo ergométrico', dificultad: 'intermedio', seriesSugeridas: 1, repeticionesSugeridas: '20 min', descansoSugerido: 'N/A' },
      { nombre: 'HIIT en Cinta', grupoMuscular: 'cardio', equipamiento: 'Cinta de correr', dificultad: 'avanzado', seriesSugeridas: 8, repeticionesSugeridas: '30 seg', descansoSugerido: '90 seg' },
      { nombre: 'Tabata', grupoMuscular: 'cardio', equipamiento: 'Sin equipo', dificultad: 'avanzado', seriesSugeridas: 8, repeticionesSugeridas: '20 seg', descansoSugerido: '10 seg' },
      { nombre: 'Salto a la Soga', grupoMuscular: 'cardio', equipamiento: 'Soga', dificultad: 'principiante', seriesSugeridas: 5, repeticionesSugeridas: '3 min', descansoSugerido: '60 seg' },
      { nombre: 'Burpees', grupoMuscular: 'cardio', equipamiento: 'Sin equipo', dificultad: 'avanzado', seriesSugeridas: 4, repeticionesSugeridas: '15 reps', descansoSugerido: '45 seg' },
      { nombre: 'Mountain Climbers', grupoMuscular: 'cardio', equipamiento: 'Sin equipo', dificultad: 'intermedio', seriesSugeridas: 4, repeticionesSugeridas: '30 seg', descansoSugerido: '30 seg' },
    ];
    
    let creados = 0;
    for (const ej of ejerciciosPredeterminados) {
      try {
        await bibliotecaEjerciciosService.create(ej);
        creados++;
      } catch (error) {
        console.warn(`⚠️ Error creando ${ej.nombre}:`, error);
      }
    }
    
    console.log(`✅ ${creados} ejercicios predeterminados creados`);
    return creados;
  }
};

