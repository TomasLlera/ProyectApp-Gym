// src/controllers/routinesController.js - ARCHIVO NUEVO

const Routine = require('../models/routines');
const Client = require('../models/client');

// Obtener todas las rutinas
exports.getAllRoutines = async (req, res) => {
  try {
    const { clienteId, activa } = req.query;
    
    let query = { activa: true }; // 🔥 Por defecto solo mostrar activas
    
    if (clienteId) query.cliente = clienteId;
    if (activa !== undefined) query.activa = activa === 'true';
    
    const routines = await Routine.find(query)
      .populate('cliente', 'nombre apellido email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: { routines }
    });
  } catch (error) {
    console.error('Error obteniendo rutinas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener rutinas'
    });
  }
};

// Obtener rutina por ID
exports.getRoutineById = async (req, res) => {
  try {
    const routine = await Routine.findById(req.params.id)
      .populate('cliente', 'nombre apellido email telefono');
    
    if (!routine) {
      return res.status(404).json({
        success: false,
        error: 'Rutina no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: routine
    });
  } catch (error) {
    console.error('Error obteniendo rutina:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener rutina'
    });
  }
};

// Crear nueva rutina
exports.createRoutine = async (req, res) => {
  try {
    const { clienteId, clienteIds, ...routineData } = req.body;
    
    // Soporte para múltiples clientes
    const targetClients = clienteIds || [clienteId];
    
    if (!targetClients || targetClients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe seleccionar al menos un cliente'
      });
    }
    
    // Verificar que todos los clientes existen
    const clients = await Client.find({ _id: { $in: targetClients } });
    if (clients.length !== targetClients.length) {
      return res.status(404).json({
        success: false,
        error: 'Uno o más clientes no encontrados'
      });
    }
    
    // Crear rutina para cada cliente
    const createdRoutines = [];
    for (const cId of targetClients) {
      const routine = new Routine({
        cliente: cId,
        ...routineData
      });
      await routine.save();
      createdRoutines.push(routine);
    }
    
    res.status(201).json({
      success: true,
      message: `${createdRoutines.length} rutina(s) creada(s) exitosamente`,
      data: createdRoutines
    });
  } catch (error) {
    console.error('Error creando rutina:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear rutina'
    });
  }
};
/* ============================================
   ➕ Crear plantilla (sin asignar clientes)
============================================ */
exports.createTemplate = async (req, res) => {
  try {
    const templateData = req.body;
    
    // Por ahora solo retornamos éxito
    // Después podemos guardar en una colección separada de templates
    console.log('📋 Plantilla creada:', templateData.nombre);
    
    res.status(201).json({
      success: true,
      message: 'Plantilla creada exitosamente',
      data: templateData
    });
  } catch (error) {
    console.error('Error creando plantilla:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear plantilla'
    });
  }
};
// Actualizar rutina
exports.updateRoutine = async (req, res) => {
  try {
    const routine = await Routine.findById(req.params.id);
    
    if (!routine) {
      return res.status(404).json({
        success: false,
        error: 'Rutina no encontrada'
      });
    }
    
    Object.assign(routine, req.body);
    await routine.save();
    
    res.json({
      success: true,
      message: 'Rutina actualizada',
      data: routine
    });
  } catch (error) {
    console.error('Error actualizando rutina:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar rutina'
    });
  }
};

// Eliminar rutina
exports.deleteRoutine = async (req, res) => {
  try {
    const routine = await Routine.findById(req.params.id);
    
    if (!routine) {
      return res.status(404).json({
        success: false,
        error: 'Rutina no encontrada'
      });
    }
    
    routine.activa = false;
    await routine.save();
    
    res.json({
      success: true,
      message: 'Rutina eliminada'
    });
  } catch (error) {
    console.error('Error eliminando rutina:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar rutina'
    });
  }
};

/* ============================================
   👥 Obtener rutinas agrupadas
============================================ */
exports.getGroupedRoutines = async (req, res) => {
  try {
    // Agrupar rutinas por nombre (mismo nombre = mismo grupo)
    const groups = await Routine.aggregate([
      {
        $match: { activa: true }
      },
      {
        $group: {
          _id: '$nombre', // Agrupar por nombre de rutina
          routineId: { $first: '$_id' }, // ID de la primera rutina del grupo
          nombre: { $first: '$nombre' },
          tipo: { $first: '$tipo' },
          nivel: { $first: '$nivel' },
          diasSemana: { $first: '$diasSemana' },
          duracionEstimada: { $first: '$duracionEstimada' },
          ejercicios: { $first: '$ejercicios' },
          clientes: { $push: '$cliente' }, // Array de IDs de clientes
          cantidad: { $sum: 1 }, // Cantidad de clientes
          createdAt: { $first: '$createdAt' }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    // Poblar datos de clientes
    await Routine.populate(groups, {
      path: 'clientes',
      select: 'nombre apellido email'
    });

    res.json({
      success: true,
      data: { groups }
    });
  } catch (error) {
    console.error('Error obteniendo rutinas agrupadas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener grupos'
    });
  }
};

/* ============================================
   ➕ Agregar cliente a grupo de rutina
============================================ */
exports.addClientToGroup = async (req, res) => {
  try {
    const { routineId, clienteId } = req.body;
    
    // Obtener rutina base
    const baseRoutine = await Routine.findById(routineId);
    if (!baseRoutine) {
      return res.status(404).json({
        success: false,
        error: 'Rutina no encontrada'
      });
    }

    // Verificar que el cliente no tenga ya esta rutina
    const exists = await Routine.findOne({
      nombre: baseRoutine.nombre,
      cliente: clienteId,
      activa: true
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        error: 'El cliente ya tiene esta rutina'
      });
    }

    // Crear copia de la rutina para el nuevo cliente
    const newRoutine = new Routine({
      cliente: clienteId,
      nombre: baseRoutine.nombre,
      descripcion: baseRoutine.descripcion,
      tipo: baseRoutine.tipo,
      nivel: baseRoutine.nivel,
      diasSemana: baseRoutine.diasSemana,
      ejercicios: baseRoutine.ejercicios,
      duracionEstimada: baseRoutine.duracionEstimada,
    });

    await newRoutine.save();

    res.json({
      success: true,
      message: 'Cliente agregado al grupo',
      data: newRoutine
    });
  } catch (error) {
    console.error('Error agregando cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al agregar cliente'
    });
  }
};

/* ============================================
   ✏️ Actualizar grupo de rutinas
============================================ */
exports.updateRoutineGroup = async (req, res) => {
  try {
    const { routineName, ...updateData } = req.body;
    
    if (!routineName) {
      return res.status(400).json({
        success: false,
        error: 'Nombre de rutina requerido'
      });
    }

    // Actualizar todas las rutinas con ese nombre
    const result = await Routine.updateMany(
      { nombre: routineName, activa: true },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} rutina(s) actualizada(s)`,
      data: result
    });
  } catch (error) {
    console.error('Error actualizando grupo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar grupo'
    });
  }
};

// Obtener plantillas
exports.getTemplates = async (req, res) => {
  const templates = [
    {
      nombre: 'Rutina Full Body - Principiante',
      tipo: 'fuerza',
      nivel: 'principiante',
      diasSemana: ['lunes', 'miercoles', 'viernes'],
      duracionEstimada: 45,
      ejercicios: [
        { nombre: 'Sentadillas', series: 3, repeticiones: '12-15', grupoMuscular: 'piernas', orden: 1 },
        { nombre: 'Press de Banca', series: 3, repeticiones: '10-12', grupoMuscular: 'pecho', orden: 2 },
        { nombre: 'Remo con Barra', series: 3, repeticiones: '10-12', grupoMuscular: 'espalda', orden: 3 },
        { nombre: 'Press Militar', series: 3, repeticiones: '10-12', grupoMuscular: 'hombros', orden: 4 },
        { nombre: 'Plancha', series: 3, repeticiones: '30-60 seg', grupoMuscular: 'abdominales', orden: 5 }
      ]
    },
    {
      nombre: 'Cardio y Resistencia',
      tipo: 'cardio',
      nivel: 'principiante',
      diasSemana: ['lunes', 'miercoles', 'viernes'],
      duracionEstimada: 40,
      ejercicios: [
        { nombre: 'Trote', series: 1, repeticiones: '20 min', grupoMuscular: 'cardio', orden: 1 },
        { nombre: 'Burpees', series: 3, repeticiones: '10-15', grupoMuscular: 'fullbody', orden: 2 },
        { nombre: 'Saltos de Cuerda', series: 3, repeticiones: '60 seg', grupoMuscular: 'cardio', orden: 3 }
      ]
    }
  ];
  
  res.json({
    success: true,
    data: templates
  });
};