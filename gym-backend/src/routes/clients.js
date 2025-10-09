const express = require('express');
const {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getStats,
  updatePaymentStatus
} = require('../controllers/clientController');
const auth = require('../middleware/auth');
const router = express.Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(auth);

// @route   GET /api/clients
// @desc    Obtener todos los clientes
// @query   ?page=1&limit=10&search=juan&status=pagado
router.get('/', getAllClients);

// @route   GET /api/clients/stats
// @desc    Obtener estadísticas generales
router.get('/stats', getStats);

// @route   GET /api/clients/:id
// @desc    Obtener cliente por ID
router.get('/:id', getClientById);

// @route   POST /api/clients
// @desc    Crear nuevo cliente
router.post('/', createClient);

// @route   PUT /api/clients/:id
// @desc    Actualizar cliente
router.put('/:id', updateClient);

// @route   PUT /api/clients/:id/payment
// @desc    Actualizar estado de pago
router.put('/:id/payment', updatePaymentStatus);

// @route   DELETE /api/clients/:id
// @desc    Eliminar cliente (soft delete)
router.delete('/:id', deleteClient);

module.exports = router;