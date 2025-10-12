// src/controllers/groupsController.js - ARCHIVO NUEVO

const Group = require('../models/groups');
const Client = require('../models/client');

/* ============================================
   📋 Obtener todos los grupos
============================================ */
exports.getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find({ activo: true })
      .populate('clientes', 'nombre apellido email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: { groups }
    });
  } catch (error) {
    console.error('Error obteniendo grupos:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener grupos'
    });
  }
};

/* ============================================
   📄 Obtener grupo por ID
============================================ */
exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('clientes', 'nombre apellido email telefono');
    
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Grupo no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Error obteniendo grupo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener grupo'
    });
  }
};

/* ============================================
   ➕ Crear grupo
============================================ */
exports.createGroup = async (req, res) => {
  try {
    const { nombre, descripcion, clientes } = req.body;
    
    if (!nombre || !clientes || clientes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nombre y al menos un cliente son requeridos'
      });
    }
    
    // Verificar que todos los clientes existen
    const clientsFound = await Client.find({ _id: { $in: clientes } });
    if (clientsFound.length !== clientes.length) {
      return res.status(404).json({
        success: false,
        error: 'Uno o más clientes no encontrados'
      });
    }
    
    const group = new Group({
      nombre,
      descripcion,
      clientes
    });
    
    await group.save();
    
    res.status(201).json({
      success: true,
      message: 'Grupo creado exitosamente',
      data: group
    });
  } catch (error) {
    console.error('Error creando grupo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear grupo'
    });
  }
};

/* ============================================
   ✏️ Actualizar grupo
============================================ */
exports.updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Grupo no encontrado'
      });
    }
    
    // Si hay clientes nuevos, verificar que existan
    if (req.body.clientes) {
      const clientsFound = await Client.find({ _id: { $in: req.body.clientes } });
      if (clientsFound.length !== req.body.clientes.length) {
        return res.status(404).json({
          success: false,
          error: 'Uno o más clientes no encontrados'
        });
      }
    }
    
    Object.assign(group, req.body);
    await group.save();
    
    const updatedGroup = await Group.findById(group._id)
      .populate('clientes', 'nombre apellido email');
    
    res.json({
      success: true,
      message: 'Grupo actualizado exitosamente',
      data: updatedGroup
    });
  } catch (error) {
    console.error('Error actualizando grupo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar grupo'
    });
  }
};

/* ============================================
   🗑️ Eliminar grupo (soft delete)
============================================ */
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Grupo no encontrado'
      });
    }
    
    group.activo = false;
    await group.save();
    
    res.json({
      success: true,
      message: 'Grupo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando grupo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar grupo'
    });
  }
};