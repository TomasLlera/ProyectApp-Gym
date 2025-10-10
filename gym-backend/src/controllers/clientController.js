// src/controllers/clientController.js

const Client = require('../models/Client');
const Payment = require('../models/Payment');

/* ============================================
   📄 Obtener todos los clientes con filtros y paginación
============================================ */
exports.getAllClients = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    
    let query = { activo: true };
    
    // Filtro por búsqueda (nombre, apellido, email o documento)
    if (search) {
      query.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { apellido: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { documento: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filtro por estado de pago
    if (status && ['pagado', 'vencido', 'pendiente'].includes(status)) {
      query.estadoPago = status;
    }
    
    const clients = await Client.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ fechaRegistro: -1 })
      .select('-__v'); // Excluir campo __v de MongoDB
    
    const total = await Client.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        clients,
        pagination: {
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error obteniendo clientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/* ============================================
   📄 Obtener cliente por ID (con historial de pagos)
============================================ */
exports.getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).select('-__v');
    
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }
    
    // Obtener los últimos 6 pagos
    const payments = await Payment.find({ cliente: client._id })
      .sort({ fecha: -1 })
      .limit(6);
    
    res.json({
      success: true,
      data: {
        client,
        payments
      }
    });
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'ID de cliente inválido'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/* ============================================
   ➕ Crear nuevo cliente
============================================ */
exports.createClient = async (req, res) => {
  try {
    const client = new Client(req.body);
    await client.save();
    
    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: client
    });
  } catch (error) {
    console.error('Error creando cliente:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        error: `Ya existe un cliente con ese ${field}`
      });
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: errors
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/* ============================================
   ✏️ Actualizar cliente
============================================ */
exports.updateClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: client
    });
  } catch (error) {
    console.error('Error actualizando cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/* ============================================
   💰 Actualizar estado de pago (versión mejorada)
============================================ */
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { estadoPago } = req.body;
    
    if (!estadoPago || !['pagado', 'vencido', 'pendiente'].includes(estadoPago)) {
      return res.status(400).json({
        success: false,
        error: 'Estado de pago inválido'
      });
    }

    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    // Actualizar estado
    client.estadoPago = estadoPago;
    
    // Si se marca como pagado, registrar la fecha de pago y calcular vencimiento
    if (estadoPago === 'pagado') {
      client.fechaUltimoPago = new Date();
      client.calcularProximoVencimiento(); // Método del modelo Client

      // Registrar el pago
      const currentDate = new Date();
      const payment = new Payment({
        cliente: client._id,
        monto: client.montoMensual,
        fecha: currentDate,
        mes: currentDate.getMonth() + 1,
        año: currentDate.getFullYear(),
        estado: 'confirmado'
      });

      await payment.save();
    }
    
    await client.save();

    console.log('Cliente actualizado:', client.estadoPago);
    console.log('Próximo vencimiento:', client.fechaVencimiento);

    res.json({
      success: true,
      message: 'Estado de pago actualizado',
      data: { client }
    });

  } catch (error) {
    console.error('Error actualizando estado de pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar estado de pago'
    });
  }
};

/* ============================================
   🗑️ Eliminar cliente (soft delete)
============================================ */
exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { activo: false },
      { new: true }
    );
    
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Cliente eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/* ============================================
   📊 Obtener estadísticas del dashboard
============================================ */
exports.getStats = async (req, res) => {
  try {
    const totalClients = await Client.countDocuments({ activo: true });
    const clientesPagados = await Client.countDocuments({ activo: true, estadoPago: 'pagado' });
    const clientesVencidos = await Client.countDocuments({ activo: true, estadoPago: 'vencido' });
    const clientesPendientes = await Client.countDocuments({ activo: true, estadoPago: 'pendiente' });
    
    // Ingresos del mes actual
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const ingresosMes = await Payment.aggregate([
      {
        $match: {
          mes: currentMonth,
          año: currentYear,
          estado: 'confirmado'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$monto' }
        }
      }
    ]);
    
    // Actividad reciente (últimos 5 clientes modificados)
    const actividadReciente = await Client.find({ activo: true })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('nombre apellido estadoPago updatedAt');
    
    res.json({
      success: true,
      data: {
        resumen: {
          totalClientes: totalClients,
          clientesPagados,
          clientesVencidos,
          clientesPendientes,
          ingresosMes: ingresosMes[0]?.total || 0
        },
        actividad: actividadReciente
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};
