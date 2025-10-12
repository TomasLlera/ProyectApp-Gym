// src/routes/routines.js - ARCHIVO NUEVO

const express = require('express');
const router = express.Router();
const routinesController = require('../controllers/routinesController');

// Si tenés middleware de auth, descomentá esta línea:
// const auth = require('../middleware/auth');
// router.use(auth);

router.post('/templates', routinesController.createTemplate);
router.get('/templates', routinesController.getTemplates);
router.get('/grouped', routinesController.getGroupedRoutines);
router.post('/add-client', routinesController.addClientToGroup);
router.put('/group', routinesController.updateRoutineGroup);
router.get('/', routinesController.getAllRoutines);
router.get('/:id', routinesController.getRoutineById);
router.post('/', routinesController.createRoutine);
router.put('/:id', routinesController.updateRoutine);
router.delete('/:id', routinesController.deleteRoutine);

module.exports = router;