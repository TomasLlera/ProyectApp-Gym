// src/routes/groups.js - ARCHIVO NUEVO

const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groupController');

// Si tenés middleware de auth, descomentá:
// const auth = require('../middleware/auth');
// router.use(auth);

router.get('/', groupsController.getAllGroups);
router.get('/:id', groupsController.getGroupById);
router.post('/', groupsController.createGroup);
router.put('/:id', groupsController.updateGroup);
router.delete('/:id', groupsController.deleteGroup);

module.exports = router;