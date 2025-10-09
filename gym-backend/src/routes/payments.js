const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Payment = require('../models/Payment');
const Client = require('../models/Client');

// Aplicar middleware de autenticación
router.use(auth);

// @route   GET /api/payments
// @desc    Obtener todos los pagos
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, mes, año } = req.query;
    
    let query = {};
    
    if (mes) query.mes = parseInt(mes);
    if (año) query.año = parseInt(año);
    
    const payments = await Payment.find(query)
      .populate('cliente', 'nombre apellido email')
      .sort({ fecha: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Payment.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo pagos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// @route   POST /api/payments
// @desc    Registrar nuevo pago
router.post('/', async (req, res) => {
  try {
    const { clienteId, monto, metodoPago, notas } = req.body;
    
    // Verificar que el cliente existe
    const client = await Client.findById(clienteId);
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }
    
    const currentDate = new Date();
    const payment = new Payment({
      cliente: clienteId,
      monto,
      metodoPago,
      notas,
      mes: currentDate.getMonth() + 1,
      año: currentDate.getFullYear()
    });
    
    await payment.save();
    
    // Actualizar estado del cliente
    client.estadoPago = 'pagado';
    client.fechaUltimoPago = currentDate;
    await client.save();
    
    res.status(201).json({
      success: true,
      message: 'Pago registrado exitosamente',
      data: payment
    });
  } catch (error) {
    console.error('Error registrando pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// @route   GET /api/payments/overdue
// @desc    Obtener clientes con pagos vencidos
router.get('/overdue', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const overdueClients = await Client.find({
      activo: true,
      $or: [
        { fechaUltimoPago: null },
        { fechaUltimoPago: { $lt: thirtyDaysAgo } }
      ]
    });
    
    res.json({
      success: true,
      data: {
        count: overdueClients.length,
        clients: overdueClients
      }
    });
  } catch (error) {
    console.error('Error obteniendo pagos vencidos:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;