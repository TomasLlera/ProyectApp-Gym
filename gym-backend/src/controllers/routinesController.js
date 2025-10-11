// src/controllers/routinesController.js - ARCHIVO NUEVO

const Routine = require('../models/routines');
const Client = require('../models/client');

// Obtener todas las rutinas
exports.getAllRoutines = async (req, res) => {
  try {
    const { clienteId, activa } = req.query;
    
    let query = {};
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
    const { clienteId, ...routineData } = req.body;
    
    const client = await Client.findById(clienteId);
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }
    
    const routine = new Routine({
      cliente: clienteId,
      ...routineData
    });
    
    await routine.save();
    
    res.status(201).json({
      success: true,
      message: 'Rutina creada exitosamente',
      data: routine
    });
  } catch (error) {
    console.error('Error creando rutina:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear rutina'
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