// src/controllers/routinesController.js - ACTUALIZADO CON NOTIFICACIONES

const Routine = require('../models/routines');
const Client = require('../models/client');
const notificationService = require('../service/notificationService');

// Obtener todas las rutinas
exports.getAllRoutines = async (req, res) => {
  try {
    const { clienteId, activa } = req.query;
    
    let query = { activa: true };
    
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

// ============================================
// OBTENER RUTINAS DEL CLIENTE (NUEVO)
// ============================================
exports.getClienteRoutines = async (req, res) => {
  try {
    const { clienteId } = req.params;
    
    // Validar ID
    if (!clienteId || clienteId.length !== 24) {
      return res.status(400).json({
        success: false,
        error: 'ID de cliente inválido'
      });
    }

    const routines = await Routine.find({
      cliente: clienteId,
      activa: true
    }).sort({ createdAt: -1 });

    if (!routines.length) {
      return res.json({
        success: true,
        message: 'El cliente aún no tiene rutinas asignadas',
        data: []
      });
    }

    res.json({
      success: true,
      data: routines
    });
  } catch (error) {
    console.error('Error obteniendo rutinas del cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener rutinas'
    });
  }
};

// ============================================
// CREAR NUEVA RUTINA + NOTIFICACIONES
// ============================================
exports.createRoutine = async (req, res) => {
  try {
    const { clienteId, clienteIds, ...routineData } = req.body;
    
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
    
    const createdRoutines = [];
    const notificationResults = [];

    // Crear rutina para cada cliente y enviar notificaciones
    for (const cId of targetClients) {
      try {
        const routine = new Routine({
          cliente: cId,
          ...routineData
        });
        await routine.save();
        createdRoutines.push(routine);

        // AQUÍ ENVIAMOS LAS NOTIFICACIONES (WhatsApp + Email)
        const cliente = clients.find(c => c._id.toString() === cId.toString());
        
        if (cliente) {
          console.log(`\n📬 Enviando notificaciones a ${cliente.nombre}...`);
          const notifResult = await notificationService.notificarNuevaRutina(cliente, routine);
          
          notificationResults.push({
            cliente: cliente.nombre,
            whatsapp: notifResult?.whatsapp ? 'Enviado' : 'No enviado',
            email: notifResult?.email ? 'Enviado' : 'No enviado',
            errores: notifResult?.errores || []
          });
        }
      } catch (error) {
        console.error(`Error creando rutina para cliente ${cId}:`, error.message);
      }
    }
    
    res.status(201).json({
      success: true,
      message: `${createdRoutines.length} rutina(s) creada(s) y notificaciones enviadas`,
      data: {
        routines: createdRoutines,
        notifications: notificationResults
      }
    });
  } catch (error) {
    console.error('Error creando rutina:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear rutina'
    });
  }
};

// Crear plantilla (sin asignar clientes)
exports.createTemplate = async (req, res) => {
  try {
    const templateData = req.body;
    
    console.log('Plantilla creada:', templateData.nombre);
    
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

// ============================================
// ACTUALIZAR RUTINA + NOTIFICACIÓN DE CAMBIOS
// ============================================
exports.updateRoutine = async (req, res) => {
  try {
    const routine = await Routine.findById(req.params.id);
    
    if (!routine) {
      return res.status(404).json({
        success: false,
        error: 'Rutina no encontrada'
      });
    }

    // Guardar valores anteriores para detectar cambios
    const anteriorNombre = routine.nombre;
    const anteriorDias = routine.diasSemana?.join(', ');
    
    Object.assign(routine, req.body);
    await routine.save();

    // Detectar cambios y notificar
    const cambios = {};
    if (anteriorNombre !== routine.nombre) {
      cambios['Nombre'] = `${anteriorNombre} → ${routine.nombre}`;
    }
    if (anteriorDias !== routine.diasSemana?.join(', ')) {
      cambios['Días'] = `${anteriorDias} → ${routine.diasSemana?.join(', ')}`;
    }

    // Si hay cambios, notificar al cliente
    if (Object.keys(cambios).length > 0) {
      const cliente = await Client.findById(routine.cliente);
      if (cliente) {
        console.log(`\n📢 Notificando cambios a ${cliente.nombre}...`);
        await notificationService.notificarCambioRutina(cliente, routine, cambios);
      }
    }
    
    res.json({
      success: true,
      message: 'Rutina actualizada',
      data: routine,
      cambiosNotificados: Object.keys(cambios).length > 0
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

// Obtener rutinas agrupadas
exports.getGroupedRoutines = async (req, res) => {
  try {
    console.log('Obteniendo rutinas agrupadas...');

    const routines = await Routine.find({ activa: true })
      .populate('cliente', 'nombre apellido email')
      .sort({ createdAt: -1 });

    console.log('Rutinas encontradas:', routines.length);

    const groupsMap = new Map();

    routines.forEach(routine => {
      const groupName = routine.nombre;
      
      if (!groupsMap.has(groupName)) {
        groupsMap.set(groupName, {
          _id: groupName,
          routineId: routine._id,
          nombre: routine.nombre,
          tipo: routine.tipo,
          nivel: routine.nivel,
          diasSemana: routine.diasSemana,
          duracionEstimada: routine.duracionEstimada,
          ejercicios: routine.ejercicios,
          clientes: [],
          cantidad: 0,
          createdAt: routine.createdAt
        });
      }

      const group = groupsMap.get(groupName);
      if (routine.cliente) {
        group.clientes.push(routine.cliente);
        group.cantidad += 1;
      }
    });

    const groups = Array.from(groupsMap.values());
    
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

// Agregar cliente a grupo de rutina
exports.addClientToGroup = async (req, res) => {
  try {
    const { routineId, clienteId } = req.body;
    
    const baseRoutine = await Routine.findById(routineId);
    if (!baseRoutine) {
      return res.status(404).json({
        success: false,
        error: 'Rutina no encontrada'
      });
    }

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

    // Enviar notificación
    const cliente = await Client.findById(clienteId);
    if (cliente) {
      await notificationService.notificarNuevaRutina(cliente, newRoutine);
    }

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

// Actualizar grupo de rutinas
exports.updateRoutineGroup = async (req, res) => {
  try {
    const { routineName, ...updateData } = req.body;
    
    if (!routineName) {
      return res.status(400).json({
        success: false,
        error: 'Nombre de rutina requerido'
      });
    }

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