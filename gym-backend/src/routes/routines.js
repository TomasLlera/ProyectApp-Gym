// src/routes/routines.js - ACTUALIZADO CON NUEVO ENDPOINT

const express = require('express');
const router = express.Router();
const routinesController = require('../controllers/routinesController');
const auth = require('../middleware/auth');

// Aplicar autenticación (opcional para algunas rutas)
// router.use(auth);

// ============================================
// RUTAS DE RUTINAS
// ============================================

// Obtener plantillas
router.get('/templates', routinesController.getTemplates);

// Obtener rutinas agrupadas
router.get('/grouped', routinesController.getGroupedRoutines);

// NUEVO: Obtener rutinas de un cliente específico
router.get('/cliente/:clienteId', routinesController.getClienteRoutines);

// Obtener todas las rutinas
router.get('/', routinesController.getAllRoutines);

// Obtener rutina por ID
router.get('/:id', routinesController.getRoutineById);

// Crear nueva rutina (con notificaciones automáticas)
router.post('/', routinesController.createRoutine);

// Crear plantilla
router.post('/templates', routinesController.createTemplate);

// Actualizar rutina (con notificación de cambios)
router.put('/:id', routinesController.updateRoutine);

// Agregar cliente a grupo de rutina
router.post('/add-client', routinesController.addClientToGroup);

// Actualizar grupo completo
router.put('/group', routinesController.updateRoutineGroup);

// Eliminar rutina (soft delete)
router.delete('/:id', routinesController.deleteRoutine);

module.exports = router;